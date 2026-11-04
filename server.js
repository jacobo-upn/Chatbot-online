import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import express from "express";
import { join } from "node:path";
import {
  buildAgentUserReply,
  parseAgentResponse,
} from "./scripts/agent-response.js";
import {
  redactPowerAutomateUrlForLog,
  saveToDataverseViaPowerAutomate,
} from "./scripts/power-automate.js";

const { FOUNDRY_PROJECT_ENDPOINT, FOUNDRY_AGENT_NAME } = process.env;

if (!FOUNDRY_PROJECT_ENDPOINT || !FOUNDRY_AGENT_NAME) {
  throw new Error(
    "FOUNDRY_PROJECT_ENDPOINT and FOUNDRY_AGENT_NAME must be configured.",
  );
}

const projectClient = new AIProjectClient(
  FOUNDRY_PROJECT_ENDPOINT,
  new DefaultAzureCredential(),
);
const openai = projectClient.getOpenAIClient({
  azureConfig: {
    agentName: FOUNDRY_AGENT_NAME,
    allowPreview: true,
  },
});

const app = express();
const publicDirectory = join(import.meta.dirname, "public");
const dataverseSaveStatuses = new Map();
const dataverseStatusRetentionMs = 5 * 60 * 1000;
const maxDataverseSaveStatuses = 100;

function setDataverseSaveStatus(conversationId, status, details = {}) {
  const now = Date.now();
  for (const [storedConversationId, entry] of dataverseSaveStatuses) {
    if (now - entry.updatedAt > dataverseStatusRetentionMs) {
      dataverseSaveStatuses.delete(storedConversationId);
    }
  }

  dataverseSaveStatuses.delete(conversationId);
  dataverseSaveStatuses.set(conversationId, {
    status,
    updatedAt: now,
    ...details,
  });
  while (dataverseSaveStatuses.size > maxDataverseSaveStatuses) {
    dataverseSaveStatuses.delete(dataverseSaveStatuses.keys().next().value);
  }
}

app.use(express.json({ limit: "10kb" }));
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/chat/status/:conversationId", (request, response) => {
  const { conversationId } = request.params;
  if (conversationId.trim().length === 0 || conversationId.length > 200) {
    response.status(422).json({ error: "El identificador de conversación no es válido." });
    return;
  }

  const entry = dataverseSaveStatuses.get(conversationId);
  if (!entry || Date.now() - entry.updatedAt > dataverseStatusRetentionMs) {
    dataverseSaveStatuses.delete(conversationId);
    response.json({ status: "unknown" });
    return;
  }

  response.json({
    status: entry.status,
    ...(Number.isInteger(entry.httpStatus) ? { http_status: entry.httpStatus } : {}),
    ...(entry.error ? { error: entry.error } : {}),
  });
});

app.post("/api/chat", async (request, response) => {
  const { message, conversation_id: requestedConversationId } = request.body ?? {};

  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.length > 2000
  ) {
    response.status(422).json({
      error: "El mensaje debe tener entre 1 y 2000 caracteres.",
    });
    return;
  }

  if (
    requestedConversationId !== undefined &&
    (typeof requestedConversationId !== "string" ||
      requestedConversationId.trim().length === 0)
  ) {
    response.status(422).json({
      error: "El identificador de conversación no es válido.",
    });
    return;
  }

  let operation = "conversation.create";

  try {
    const conversation =
      requestedConversationId === undefined
        ? await openai.conversations.create()
        : { id: requestedConversationId };

    operation = "responses.create";
    const result = await openai.responses.create(
      {
        conversation: conversation.id,
        input: message,
      },
      {
        body: {
          agent_reference: {
            name: FOUNDRY_AGENT_NAME,
            type: "agent_reference",
          },
        },
      },
    );

    console.info("Respuesta cruda recibida del agente.", {
      response: redactPowerAutomateUrlForLog(result.output_text),
    });

    let dataverseSave = "not_queued";
    let dataverseSaveError;
    let userReply = result.output_text;
    try {
      const agentPayload = parseAgentResponse(result.output_text);
      userReply = buildAgentUserReply(agentPayload);
      console.info(
        "JSON de prospectos generado por el agente.",
        redactPowerAutomateUrlForLog(agentPayload),
      );
      dataverseSave = "queued";
      setDataverseSaveStatus(conversation.id, "pending");
      // Esperar el webhook evita que el proceso termine la solicitud antes de
      // que Power Automate reciba el payload, especialmente en App Service y
      // otros hosts que pueden interrumpir trabajo asincrónico desprendido.
      const saveResult = await saveToDataverseViaPowerAutomate(agentPayload);
      const status = saveResult?.ok !== true
        ? "failed"
        : saveResult.status === 202
          ? "accepted"
          : "succeeded";
      setDataverseSaveStatus(conversation.id, status, {
        ...(Number.isInteger(saveResult?.status)
          ? { httpStatus: saveResult.status }
          : {}),
        ...(saveResult?.error ? { error: saveResult.error } : {}),
      });
    } catch (error) {
      dataverseSaveError =
        error instanceof Error ? error.message : "Error inesperado.";
      setDataverseSaveStatus(conversation.id, "failed", {
        error: dataverseSaveError,
      });
      console.error("No se enviaron prospectos a Power Automate.", {
        error: dataverseSaveError,
      });
    }

    const chatResponse = {
      reply: userReply,
      conversation_id: conversation.id,
      dataverse_save: dataverseSave,
      ...(dataverseSaveError ? { dataverse_save_error: dataverseSaveError } : {}),
    };
    response.json(chatResponse);
  } catch (error) {
    const diagnostic = {
      name: error instanceof Error ? error.name : "UnknownError",
      operation,
    };

    if (error && typeof error === "object") {
      for (const key of ["code", "status", "statusCode", "type", "param"]) {
        const value = error[key];
        if (
          (typeof value === "string" && /^[a-zA-Z0-9_.-]{1,80}$/.test(value)) ||
          (typeof value === "number" && Number.isInteger(value))
        ) {
          diagnostic[key] = value;
        }
      }
    }

    console.error(
      "No fue posible completar la solicitud a Microsoft Foundry.",
      diagnostic,
    );
    response.status(502).json({
      error: "No se pudo obtener una respuesta en este momento. Inténtalo de nuevo.",
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}.`);
});
