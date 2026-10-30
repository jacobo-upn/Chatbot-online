 ---
name: 'Backend Express'
description: 'Usar al crear o modificar el backend Node.js que llama a Microsoft Foundry.'
applyTo: 'server.js,scripts/**'
---
# Reglas del backend
* Crea el `AIProjectClient` y el cliente de OpenAI una sola vez al iniciar, no en cada request.
* En cada `responses.create`, pasa `input` y `conversation` como primer argumento
y la referencia del agente como segundo argumento:
`responses.create({ input, conversation }, { body: { agent_reference: { name: AGENT_NAME, type: "agent_reference" } } })`.
* Usa `async/await` y envuelve las llamadas al SDK en `try/catch` → 502 genérico.
* Resuelve rutas de archivos con `import.meta.dirname`, no con el directorio actual.
* No agregues dependencias nuevas sin mencionarlas en el plan.
* Usa `npm run dev` para desarrollo y `npm start` para producción.
* Mantén el endpoint `/health` como único endpoint de salud; debe devolver 200 OK y `{ status: "ok" }` para monitoreo.
* Obtén el JSON generado después de la petición de prospectos, guardala de forma temporal en memoria y despues invoca el flujo de power automate.
* La petición de chat no debe esperar al flujo de Power Automate. Conserva su resultado temporal por `conversation_id` y expón el estado (`pending`, `succeeded` o `failed`) en `/api/chat/status/:conversationId` para que la interfaz confirme el resultado sin bloquear el chat.
