# Instrucciones del proyecto: Chatbot Foundry en App Service

## Alcance y arquitectura

- Aplicación web de una sola vista: frontend HTML/CSS/JavaScript vanilla en `public/`; backend Node.js y Express en `server.js`.
- El backend sirve `public/`, expone `POST /api/chat` y `GET /health`, y es el único componente que se comunica con Azure AI Foundry y Power Automate.
- No cambies esta arquitectura ni la lógica de negocio del agente sin pedir confirmación.
- Conserva la conversación multi-turno: el navegador envía `conversation_id` al backend; Foundry usa `openai.conversations.create()` y `openai.responses.create()`.
- La respuesta del agente que se envía al usuario debe conservarse aunque falle el guardado en Dataverse.

## Stack y convenciones

- Windows 11, PowerShell, Node.js 24 LTS, npm, Express 5 y ES Modules (`"type": "module"`). No uses TypeScript, bundlers ni frameworks frontend.
- Para Foundry usa `@azure/ai-projects` 2.x (Foundry projects new API) y `DefaultAzureCredential` de `@azure/identity`. No uses `@azure/ai-agents` ni la API 1.x.
- Crea los clientes de Foundry una sola vez al iniciar el servidor, no por solicitud.
- Carga variables locales con `node --env-file-if-exists=.env`; no agregues `dotenv`.
- Resuelve rutas relativas al servidor con `import.meta.dirname`, no con el directorio de trabajo actual.
- Los comentarios nuevos deben estar en español neutro; usa nombres de variables en inglés.
- Sigue las instrucciones específicas en `.github/instructions/backend.instructions.md` y `.github/instructions/frontend.instructions.md` cuando modifiques esas áreas.

## Variables de entorno y seguridad

- Lee la configuración desde variables de entorno; nunca hardcodees endpoints reales, secretos, tokens ni URLs firmadas.
- Variables usadas por la aplicación: `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_AGENT_NAME` y `POWER_AUTOMATE_URL`.
- En local, configura esas variables en `.env` (no se versiona). En Azure App Service, configúralas en App Settings; no incluyas `.env` en paquetes ni despliegues.
- En Azure usa identidad administrada para Foundry, nunca claves de acceso en el código.
- Valida `message` como texto de 1 a 2000 caracteres y responde 422 si no cumple. No expongas trazas ni detalles internos al cliente.
- No registres secretos, la URL completa de Power Automate, tokens, datos personales ni payloads sensibles. Redacta la URL y limita los datos diagnósticos de los logs.

## Flujo de prospectos y Power Automate

- El agente debe devolver JSON con `empresas` como arreglo no vacío. Rechaza respuestas vacías, JSON inválido, ausencia de `empresas` o lista vacía para el envío; no inventes ni transformes datos del agente.
- Después de recibir y validar la respuesta de Foundry, usa el servicio desacoplado `saveToDataverseViaPowerAutomate()` para enviar el JSON completo a `POWER_AUTOMATE_URL` con `POST` y `Content-Type: application/json`.
- La llamada al flujo no debe bloquear ni cambiar la respuesta del chatbot. Maneja explícitamente errores de configuración, red, timeout (60 segundos), HTTP y excepciones; registra diagnósticos seguros.
- Considera exitosos los estados HTTP 200, 201 y 202. Si falla Power Automate, registra el resultado sin fallar la respuesta normal al usuario.
- No llames a Power Automate desde el navegador ni expongas `POWER_AUTOMATE_URL` al frontend.

## Validación y despliegue

- Ejecuta `npm test` para las pruebas automatizadas y `npm run dev` para desarrollo local.
- Comprueba la salud con `Invoke-RestMethod http://localhost:3000/health`; debe devolver `status: ok`.
- Antes de desplegar, confirma que `package.json` incluye todos los módulos importados y que `start` sea `node server.js`.
- El servidor debe escuchar en `process.env.PORT` para Azure App Service Linux.
- No despliegues ni modifiques recursos de Azure sin una solicitud explícita; antes de publicar, confirma el destino de producción y las App Settings requeridas.
- Sigue `.github/instructions/deployment.instructions.md` para destinos, costos, empaquetado y comandos de despliegue en Azure.
