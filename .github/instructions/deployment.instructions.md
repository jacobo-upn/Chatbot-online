---
name: 'Despliegue Azure App Service'
description: 'Desplegar este chatbot a App Service Linux y Foundry sin crear costos inesperados.'
applyTo: '**/*'
---

# Despliegues Azure

## Destino existente y costos

- Antes de cada comando `az`, muestra el comando y explica brevemente qué hará. Usa sintaxis de PowerShell.
- Consulta el recurso y el plan actuales antes de desplegar. No supongas que un nombre de sitio, plan o proyecto está disponible.
- La preferencia del usuario es no crear planes o recursos que puedan generar cargos sin autorización explícita. Reutiliza recursos existentes y conserva el SKU gratuito cuando corresponda; confirma antes de crear o cambiar a un SKU de pago.
- Destino conocido de este proyecto: App Service `app-service-chatbot`, grupo `rg-isc.javierjacobo25-ia-6877`, plan `ASP-rgiscjavierjacobo25ia6877-b650` (F1/Free), Linux, runtime `NODE:24-lts`.
- Foundry conocido: proyecto `iscjavierjacobo25-ia-3562`, dentro de la cuenta `iscjavierjacobo25-ia-35-resource`, en el mismo grupo de recursos. Verifica el ID de recurso y el scope antes de asignar permisos.

## Publicación

- Para actualizar la App Service existente, prefiere `az webapp deploy --resource-group ... --name ... --src-path ... --type zip`. Este comando despliega a un sitio existente sin crear un plan.
- No dependas de `az webapp up` para encontrar un sitio existente: la versión instalada de Azure CLI llegó a reportar que no existía y falló al consultar regiones (`list_geo_regions`). Si se considera `az webapp up`, verifica destino y SKU primero; nunca permitas que cree un plan de pago por defecto.
- El ZIP debe conservar las rutas relativas del proyecto. Incluye `server.js`, `package.json`, `package-lock.json`, `public/` y los módulos fuente requeridos de `scripts/`; excluye `.env`, `.git` y cualquier `node_modules`.
- `az webapp deploy` no instala dependencias por sí solo. Verifica `SCM_DO_BUILD_DURING_DEPLOYMENT=true` antes de publicar para que Oryx haga el build remoto de Node.
- Si un archivo incluido necesita conservar su carpeta (por ejemplo `scripts/agent-response.js`), valida los nombres de entrada del ZIP antes de subirlo. No uses un empaquetado que aplane esas rutas.

## Configuración y acceso a Foundry

- Lee `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_AGENT_NAME` y `POWER_AUTOMATE_URL` desde `.env` local y configura los valores en App Service Settings. Nunca muestres los valores ni los guardes en archivos de despliegue.
- En Windows, `az` puede resolverse a un `az.cmd`; caracteres como `&` en `POWER_AUTOMATE_URL` pueden ser interpretados por `cmd.exe`. Si ocurre, localiza el `python.exe` de Azure CLI junto a `wbin/az.cmd` y llama directamente `python.exe -IBm azure.cli ...`, pasando cada ajuste como un argumento separado y suprimiendo la salida con `--output none`.
- Usa la identidad administrada del sistema de la App Service. En el proyecto de Foundry, asigna el rol `Foundry User` al principal de esa identidad con scope limitado al proyecto. Evita claves de cuenta.

## Cierre y verificación

- Reinicia la App Service después de actualizar App Settings.
- Comprueba `https://<sitio>.azurewebsites.net/health`; debe devolver HTTP 200 y `{"status":"ok"}`.
- Si la publicación o la salud falla, revisa `az webapp log tail` y el estado de la App Service. Confirma de nuevo que el SKU sigue siendo el aprobado.
