const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const sendButtonLabel = sendButton.querySelector("span");
const messages = document.querySelector("#messages");
const characterCount = document.querySelector("#character-count");

let conversationId;
let isSending = false;

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (isSending || message.length === 0 || message.length > 2000) {
    return;
  }

  addMessage(message, "user");
  isSending = true;
  sendButton.disabled = true;
  sendButtonLabel.textContent = "Escribiendo…";

  try {
    const payload = { message };
    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "No se pudo enviar el mensaje. Inténtalo de nuevo.",
      );
    }

    if (typeof result.reply !== "string" || typeof result.conversation_id !== "string") {
      throw new Error("El servidor devolvió una respuesta no válida.");
    }

    conversationId = result.conversation_id;
    addMessage(result.reply, "assistant");
    input.value = "";
    input.style.height = "auto";
    updateCharacterCount();
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "No se pudo enviar el mensaje. Inténtalo de nuevo.";
    addMessage(errorMessage, "assistant", true);
  } finally {
    isSending = false;
    sendButton.disabled = false;
    sendButtonLabel.textContent = "Enviar";
    input.focus();
  }
});
