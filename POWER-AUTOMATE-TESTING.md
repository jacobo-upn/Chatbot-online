# Pruebas de integración con Power Automate

## 1. Configuración

En desarrollo, las variables se leen desde `.env` mediante `npm run dev` o `npm start`.
En producción deben configurarse como variables de entorno del Web Service/App Service:

- `FOUNDRY_PROJECT_ENDPOINT`
- `FOUNDRY_AGENT_NAME`
- `POWER_AUTOMATE_URL`

`POWER_AUTOMATE_URL` debe ser la URL completa generada por el disparador **When an HTTP request is received**, incluidos sus parámetros de consulta (`sig`, `sp`, `sv`, etc.). No se debe copiar la URL en el frontend ni en un archivo de despliegue.

## 2. Verificación del servicio

Iniciar localmente:

```powershell
npm install
npm test
npm start
```

En otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Resultado esperado:

```json
{"status":"ok"}
```

## 3. Prueba del chat y del disparo

Enviar una solicitud real al backend:

```powershell
$body = @{ message = "Busca empresas prospecto de tecnología en México" } | ConvertTo-Json
$result = Invoke-RestMethod `
  -Uri http://localhost:3000/api/chat `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body

$result | ConvertTo-Json -Depth 10
```

La respuesta debe incluir:

```json
{
  "reply": "...",
  "conversation_id": "...",
  "dataverse_save": "queued"
}
```

`queued` confirma que la salida del agente contenía JSON válido con una lista no vacía llamada `empresas` y que el backend inició el envío asíncrono. La respuesta del agente puede ser JSON puro o un bloque Markdown ` ```json ... ``` `.

Consultar el estado usando el `conversation_id` obtenido:

```powershell
$conversationId = $result.conversation_id
Invoke-RestMethod "http://localhost:3000/api/chat/status/$conversationId"
```

Estados posibles:

- `pending`: la solicitud fue enviada y aún no termina.
- `succeeded`: Power Automate respondió HTTP 200 o 201. Para confirmar el guardado, configura la acción **Response** al final del flujo, después de las acciones de Dataverse.
- `accepted`: Power Automate respondió HTTP 202. El disparador aceptó/encoló la solicitud, pero el backend no puede confirmar que las acciones posteriores terminaron.
- `failed`: faltan variables, la URL es inválida, hubo un error de red o Power Automate respondió con otro código. El endpoint puede incluir `http_status` y `error`.

## 4. Validación en Power Automate

En el disparador HTTP, usar **Use sample payload to generate schema** con un ejemplo como:

```json
{
  "empresas": [
    {
      "nombre": "Empresa de ejemplo",
      "calificacion": 1,
      "presenciaDigital": "1",
      "sector": "Tecnología",
      "domicilio": "Domicilio de ejemplo",
      "municipio": "Municipio de ejemplo",
      "estado": 1,
      "sitioWeb": "https://example.com",
      "prospectos": [
        {
          "nombre": "Prospecto 1",
          "cargo": "Director",
          "correo": "prospecto1@example.com",
          "telefono": "5550000001",
          "notasIA": "Notas del análisis"
        },
        {
          "nombre": "Prospecto 2",
          "cargo": "Gerente",
          "correo": "prospecto2@example.com",
          "telefono": "5550000002",
          "notasIA": "Notas del análisis"
        }
      ]
    }
  ]
}
```

El esquema actual del disparador exige `calificacion` y `estado` como enteros. Los campos `presenciaDigital`, `sector`, `domicilio`, `municipio`, `sitioWeb` y todos los campos de cada prospecto deben ser texto. El arreglo `prospectos` puede estar vacío; el backend lo acepta para mantener el mismo contrato del disparador.

El backend envía exactamente el objeto generado por el agente; no agrega una propiedad `body` ni `data`. Para conocer el resultado real del procesamiento desde el chat, configura en Power Automate una acción **Response** al final del flujo (después de crear/verificar registros en Dataverse) que devuelva HTTP 200/201 en éxito y un código 4xx/5xx en error. Si el flujo responde 202, el chat indicará que la solicitud fue aceptada pero que el resultado final no está confirmado. Revisa el historial de ejecuciones para diagnosticar ese caso.

## 5. Interpretación de fallos

- `dataverse_save = not_queued`: el agente no devolvió un objeto JSON válido con `empresas` como arreglo no vacío. Revisar la respuesta `reply` y el log `No se enviaron prospectos a Power Automate`.
- Estado `failed` con log `POWER_AUTOMATE_URL no está configurada`: agregar la variable al entorno donde corre el servicio y reiniciarlo.
- Estado `failed` con código HTTP: revisar el historial del flujo y el esquema del disparador. El código se registra como `status`.
- Sin ejecución visible en Power Automate: comprobar que la solicitud llegó al backend, que el estado fue `queued` y que la URL configurada es la URL actual del disparador.
- `unknown`: el estado se conserva en memoria durante cinco minutos y se pierde al reiniciar el proceso.

## 7. Resultado de la prueba de integración

El 30 de octubre de 2026 se envió una prueba controlada con:

- Empresa: `EMPRESA-PA-TEST-20261030`
- Prospectos: `PROSPECTO-PA-TEST-01` y `PROSPECTO-PA-TEST-02`

El webhook respondió HTTP 202, por lo que el disparador aceptó el payload. Después de esperar el procesamiento asíncrono, no se encontraron registros con esos identificadores en las tablas `Empresa` y `Prospecto` de Dataverse. No fue necesario eliminar registros.

Si el webhook devuelve 202 pero Dataverse queda vacío, revisar el historial de ejecuciones del flujo y las acciones posteriores al disparador. La cuenta usada para esta prueba no tenía permiso para consultar ese historial mediante la API de Power Platform.

## 6. Pruebas automatizadas

Ejecutar:

```powershell
npm test
```

Estas pruebas validan la forma del payload, la llamada HTTP, los estados de error, el timeout y la protección de la URL firmada en los logs. La prueba real de integración requiere ejecutar el backend con una `POWER_AUTOMATE_URL` válida y revisar el historial del flujo.
