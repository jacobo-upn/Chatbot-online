const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const sendButtonLabel = sendButton.querySelector(".send-label");
const loadingSpinner = sendButton.querySelector(".spinner");
const clearButton = document.querySelector("#clear-button");
const themeToggle = document.querySelector("#theme-toggle");
const messages = document.querySelector("#messages");
const characterCount = document.querySelector("#character-count");
const saveStatus = document.querySelector("#save-status");
const connectionStatus = document.querySelector("#connection-status");
const connectionLabel = document.querySelector("#connection-label");

let conversationId;
let isSending = false;
const themeStorageKey = "chat-theme";

function getSavedTheme() {
  try {
    const theme = window.localStorage.getItem(themeStorageKey);
    return theme === "light" || theme === "dark" ? theme : null;
  } catch {
    return null;
  }
}

function applyTheme(theme, persist = false) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("theme-dark", isDark);
  document.documentElement.classList.toggle("theme-light", !isDark);
  themeToggle.textContent = isDark ? "Tema claro" : "Tema oscuro";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro",
  );

  if (persist) {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // El tema sigue aplicado aunque el navegador bloquee el almacenamiento.
    }
  }
}

function setProcessingState(isProcessing) {
  input.disabled = isProcessing;
  sendButton.disabled = isProcessing;
  clearButton.disabled = isProcessing;
  loadingSpinner.hidden = !isProcessing;
  sendButtonLabel.textContent = isProcessing ? "Procesando…" : "Enviar";
  form.setAttribute("aria-busy", String(isProcessing));
}

function addMessage(text, role, isError = false) {
  const message = document.createElement("p");
  message.classList.add("message", `message-${role}`);
  if (isError) {
    message.classList.add("message-error");
  }
  message.textContent = text;
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
}

function updateCharacterCount() {
  characterCount.textContent = `${input.value.length} / 2000`;
}

function setConnectionStatus(isOnline) {
  connectionStatus.classList.remove("connection-unknown");
  connectionStatus.classList.toggle("connection-error", !isOnline);
  connectionLabel.textContent = isOnline ? "En línea" : "Sin conexión";
}

function showSaveStatus(text, isError = false) {
  saveStatus.textContent = text;
  saveStatus.hidden = false;
  saveStatus.classList.toggle("save-status-error", isError);
}

async function monitorDataverseSave(conversationId) {
  const deadline = Date.now() + 65_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `/api/chat/status/${encodeURIComponent(conversationId)}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) {
        throw new Error("No se pudo consultar el estado del guardado.");
      }

      const result = await response.json();
      console.info("[chat] Estado de Power Automate:", {
        status: result.status,
        httpStatus: result.http_status ?? null,
        error: result.error ?? null,
      });
      if (result.status === "succeeded") {
        showSaveStatus(
          `Power Automate terminó correctamente (HTTP ${result.http_status}).`,
        );
        return;
      }
      if (result.status === "accepted") {
        showSaveStatus(
          `Power Automate aceptó la solicitud (HTTP ${result.http_status}), pero no confirmó el fin del flujo ni el guardado en Dataverse. Revisa el historial de ejecuciones.`,
          true,
        );
        return;
      }
      if (result.status === "failed") {
        showSaveStatus(
          `Falló la llamada a Power Automate${result.http_status ? ` (HTTP ${result.http_status})` : ""}${result.error ? `: ${result.error}` : "."}`,
          true,
        );
        return;
      }
      if (result.status === "unknown") {
        showSaveStatus(
          "No se pudo verificar el estado del guardado en Dataverse.",
          true,
        );
        return;
      }
    } catch {
      showSaveStatus(
        "No se pudo verificar el estado del guardado en Dataverse.",
        true,
      );
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }

  showSaveStatus(
    "Power Automate no confirmó el guardado en Dataverse dentro del tiempo esperado.",
    true,
  );
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  updateCharacterCount();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

clearButton.addEventListener("click", () => {
  if (isSending) {
    return;
  }

  conversationId = undefined;
  messages.replaceChildren();
  addMessage(
    "Conversación limpiada. Cuéntame qué tipo de clientes buscas y te ayudaré a encontrar nuevas oportunidades.",
    "assistant",
  );
  input.value = "";
  input.style.height = "auto";
  updateCharacterCount();
  input.focus();
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.classList.contains("theme-dark")
    ? "light"
    : "dark";
  applyTheme(nextTheme, true);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();

  if (isSending || message.length === 0 || message.length > 2000) {
    return;
  }

  addMessage(message, "user");
  isSending = true;
  setProcessingState(true);

  try {
    const payload = { message };
    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    console.info("[chat] Enviando mensaje al backend.", {
      messageLength: message.length,
      hasConversation: Boolean(conversationId),
    });
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.info("[chat] Respuesta del backend:", {
      httpStatus: response.status,
      ok: response.ok,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "No se pudo enviar el mensaje. Inténtalo de nuevo.",
      );
    }

    if (
      typeof result.reply !== "string" ||
      typeof result.conversation_id !== "string"
    ) {
      throw new Error("El servidor devolvió una respuesta no válida.");
    }

    conversationId = result.conversation_id;
    console.info("[chat] Respuesta de Foundry recibida.", {
      dataverseSave: result.dataverse_save ?? null,
      hasReply: typeof result.reply === "string" && result.reply.length > 0,
    });
    addMessage(result.reply, "assistant");
    if (result.dataverse_save === "queued") {
      showSaveStatus("Solicitud enviada; esperando respuesta de Power Automate.");
      void monitorDataverseSave(conversationId);
    } else {
      showSaveStatus(
        result.dataverse_save_error
          ? `No se llamó a Power Automate: ${result.dataverse_save_error}`
          : "La respuesta no contenía prospectos válidos para guardar en Dataverse.",
        true,
      );
    }
    setConnectionStatus(true);
    input.value = "";
    input.style.height = "auto";
    updateCharacterCount();
  } catch (error) {
    console.error("[chat] Error en la solicitud:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "No se pudo enviar el mensaje. Inténtalo de nuevo.";
    addMessage(errorMessage, "assistant", true);
    setConnectionStatus(false);
    showSaveStatus("No fue posible completar la operación.", true);
  } finally {
    isSending = false;
    setProcessingState(false);
    input.focus();
  }
});

const savedTheme = getSavedTheme();
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme ?? (systemPrefersDark ? "dark" : "light"));

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (getSavedTheme() === null) {
    applyTheme(event.matches ? "dark" : "light");
  }
});

updateCharacterCount();

console.info("[chat] app.js cargado correctamente.");
