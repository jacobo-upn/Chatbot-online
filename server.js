import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import express from "express";
import { join } from "node:path";

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

app.use(express.json({ limit: "10kb" }));
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
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
    response.status(422).json({ error: "El identificador de conversación no es válido." });
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
        input: [{ role: "user", content: message }],
      },
    );

    response.json({
      reply: result.output_text,
      conversation_id: conversation.id,
    });
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
    console.error("No fue posible completar la solicitud a Microsoft Foundry.", diagnostic);
    response.status(502).json({
      error: "No se pudo obtener una respuesta en este momento. Inténtalo de nuevo.",
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}.`);
});
