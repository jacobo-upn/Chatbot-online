# Chatbot prospectador de clientes para Softdev

Aplicación web que convierte conversaciones comerciales en prospectos estructurados para Softdev Tecnología e Innovación. El usuario describe sector y ciudad para que un agente de Microsoft Foundry identifique empresas y prospectos calificados para comenzar relaciones comerciales. El resultado se guarda con una automatización en una base de datos en Dataverse.

## Demo

- [Aplicación desplegada](https://app-service-chatbot-bnaqdqheb4dbgdh7.westus-01.azurewebsites.net/)

## Funcionalidades

- Chat en español para definir el perfil de cliente buscado.
- Conversaciones persistentes mediante un identificador de conversación de Microsoft Foundry.
- Generación de empresas prospecto y contactos con información comercial.
- Resumen legible para el usuario con calificación, oportunidad principal y número de prospectos.
- Validación del payload antes de enviarlo a integraciones externas.
- Envío del payload a un webhook de Power Automate para crear o actualizar registros en Dataverse.
- Consulta del estado del guardado: pendiente, exitoso, aceptado, fallido o desconocido.
- Modo claro/oscuro, contador de caracteres, limpieza de conversación y diseño adaptable.
- Protección de URLs firmadas y tokens en los logs del servidor.
- Endpoint de salud para monitoreo del servicio.

## Arquitectura

```text
Navegador
   |
   | POST /api/chat
   v
Servidor Node.js + Express
   |
   +--> Microsoft Foundry Agent
   |       \
   |        \--> JSON validado de empresas y prospectos
   |
   +--> Power Automate Webhook --> Dataverse
   |
   +--> GET /api/chat/status/:conversationId
```

El frontend está en `public/`. El backend recibe los mensajes, crea o reutiliza la conversación, consulta al agente configurado y transforma la respuesta estructurada en un resumen. Cuando el payload es válido, lo envía exactamente como fue generado por el agente a Power Automate.

## Tecnologías

- Node.js 24
- Express 5
- Microsoft Foundry Agents mediante `@azure/ai-projects`
- Autenticación de Azure mediante `DefaultAzureCredential`
- Power Automate y Dataverse
- HTML, CSS y JavaScript nativo en el frontend

## Requisitos

- Node.js `>=24 <25`
- Acceso a un proyecto de Microsoft Foundry y a un agente configurado.
- Una URL HTTPS de Power Automate con el disparador **When an HTTP request is received**.
- Permisos de Azure para que `DefaultAzureCredential` acceda al proyecto de Foundry.

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env-example` como `.env` y configura las variables:

   ```env
   FOUNDRY_PROJECT_ENDPOINT=https://<recurso>.services.ai.azure.com/api/projects/<proyecto>
   FOUNDRY_AGENT_NAME=asistente-web
   POWER_AUTOMATE_URL=https://<webhook-de-power-automate>
   ```

   `POWER_AUTOMATE_URL` debe conservar la URL completa del webhook, incluidos sus parámetros de consulta. No debe incluirse en el frontend, en el repositorio ni en archivos de despliegue.

3. Inicia el servidor:

   ```bash
   npm start
   ```

   Para desarrollo con reinicio automático:

   ```bash
   npm run dev
   ```

4. Abre `http://localhost:3000`.

## API

### `GET /health`

Comprueba que el proceso está disponible.

```json
{"status":"ok"}
```

### `POST /api/chat`

Recibe un mensaje de hasta 2,000 caracteres. En el primer mensaje se crea una conversación; los siguientes reutilizan `conversation_id`.

```json
{
  "message": "Busca empresas de tecnología en México",
  "conversation_id": "opcional"
}
```

Respuesta:

```json
{
  "reply": "Resumen ejecutivo...",
  "conversation_id": "...",
  "dataverse_save": "queued"
}
```

`dataverse_save` puede ser `queued` o `not_queued`. Si la respuesta del agente no contiene un payload válido, no se envía información a Power Automate.

### `GET /api/chat/status/:conversationId`

Consulta el resultado del envío a Power Automate. El estado se conserva en memoria durante cinco minutos y puede ser:

- `pending`: solicitud enviada, aún en proceso.
- `succeeded`: Power Automate respondió HTTP 200 o 201.
- `accepted`: respondió HTTP 202; el flujo fue aceptado, pero no se confirmó el guardado final.
- `failed`: error de configuración, red o respuesta HTTP no exitosa.
- `unknown`: no existe un estado disponible, por ejemplo después de reiniciar el servidor.

## Contrato de datos

El agente debe devolver JSON puro o JSON dentro de un bloque Markdown con esta forma:

```json
{
  "empresas": [
    {
      "nombre": "Empresa de ejemplo",
      "calificacion": 1,
      "presenciaDigital": "1",
      "sector": "Tecnología",
      "domicilio": "Domicilio de ejemplo",
      "municipio": "Municipio",
      "estado": 1,
      "sitioWeb": "https://example.com",
      "prospectos": [
        {
          "nombre": "Nombre del contacto",
          "cargo": "Director",
          "correo": "contacto@example.com",
          "telefono": "5550000000",
          "notasIA": "Oportunidad detectada por el análisis."
        }
      ]
    }
  ]
}
```

`empresas` debe ser un arreglo no vacío. Los campos `calificacion` y `estado` son enteros; los demás campos de empresa y contacto son texto. Una empresa puede tener cero prospectos.

## Power Automate y Dataverse

Configura el disparador HTTP usando **Use sample payload to generate schema** con el contrato anterior. Para que el chatbot confirme el resultado final, agrega una acción **Response** al final del flujo, después de las operaciones de Dataverse:

- HTTP 200 o 201: guardado confirmado.
- HTTP 202: solicitud aceptada, pero resultado final no confirmado.
- HTTP 4xx/5xx: el chatbot reporta un fallo.

El flujo debe encargarse de mapear cada empresa y sus prospectos a las tablas correspondientes de Dataverse. Para diagnosticar respuestas 202, revisa el historial de ejecuciones de Power Automate.

## Pruebas

Ejecuta las pruebas automatizadas con:

```bash
npm test
```

Las pruebas cubren la validación del payload, JSON dentro de bloques Markdown, construcción del resumen, envío HTTP, respuestas de error, timeout, fallos de red y redacción de secretos en logs.

Para verificar el servicio manualmente:

```bash
curl http://localhost:3000/health
```

La prueba real de integración requiere las variables de entorno configuradas y una URL válida de Power Automate.

## Despliegue

El proyecto puede ejecutarse en Azure App Service o en cualquier servicio compatible con Node.js. Configura como variables de entorno del servicio:

```text
FOUNDRY_PROJECT_ENDPOINT
FOUNDRY_AGENT_NAME
POWER_AUTOMATE_URL
PORT (opcional; App Service suele proporcionarlo automáticamente)
```

El comando de inicio es:

```bash
npm start
```

No subas `.env`, URLs firmadas de Power Automate, credenciales ni archivos generados de despliegue al repositorio.

## Estructura principal

```text
.
├── public/
│   ├── index.html              # Interfaz del chatbot
│   ├── app.js                  # Estado, chat y temas visuales
│   ├── styles.css              # Estilos principales
│   └── architecture-overrides.css
├── scripts/
│   ├── agent-response.js       # Validación y resumen del payload
│   ├── power-automate.js       # Integración con el webhook
│   └── *.test.js               # Pruebas automatizadas
├── server.js                   # API y conexión con Microsoft Foundry
├── .env-example                # Plantilla de configuración
└── package.json
```

## Seguridad y operación

- Mantén las credenciales fuera del código fuente y usa variables de entorno o la configuración segura del servicio.
- Usa siempre HTTPS para el webhook de Power Automate.
- Los tokens de la URL firmada se eliminan de los logs.
- El endpoint de estado usa memoria local; para múltiples instancias o persistencia entre reinicios debe sustituirse por un almacenamiento compartido.
- Revisa los permisos de la identidad utilizada por `DefaultAzureCredential` sobre Microsoft Foundry y los permisos de conexión de Power Automate hacia Dataverse.
