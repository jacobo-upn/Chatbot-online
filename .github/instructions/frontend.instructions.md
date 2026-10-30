---
name: 'Frontend del chat'
description: 'Usar al crear o modificar la interfaz web del chatbot.'
applyTo: 'public/**'
---
# Reglas del frontend
* Solo HTML, CSS y JavaScript vanilla (ES2020+). Sin frameworks ni CDNs.
* Inserta el texto del bot con `textContent`, nunca con `innerHTML` (evita XSS).
* Guarda el `conversation_id` en una variable de JS; se reinicia al recargar.
* Mientras se procesa una respuesta, deshabilita el textarea y las acciones que modifican o envían la conversación; muestra un spinner visible y un estado accesible como "Procesando…". Restablece los controles al terminar, también si ocurre un error.
* Diseño responsivo: debe verse bien a 360 px de ancho.
* Usa variables CSS en `:root`, con fondo claro/blanco y acentos verdes/azules; respeta `prefers-color-scheme` al iniciar y permite alternar entre temas claro y oscuro. El tema elegido manualmente debe persistir y poder cambiarse de nuevo.
* Coloca todos los recursos estáticos dentro de `public/`; las imágenes van en `public/imgs/`, porque Express solo sirve `public/`.
* Agrega el ícono del bot en la pestaña del navegador con `<link rel="icon" href="imgs/favicon.ico">`.
* Usa `public/imgs/softdev-logo.png` como logotipo de Softdev.
* Agrega un SVG del robot en `public/imgs/bot.svg` para la interfaz.
* Mejora el diseño de la interfaz con CSS, pero no uses frameworks ni CDNs. Usa los colores similares al sitio web www.softdev.com.mx destacando el verde y azul para destacar elementos, y el blanco como fondo.
* Agrega un botón para limpiar la conversación y reiniciar el `conversation_id`.
* Agrega un botón para cambiar entre modo claro y oscuro, usando `prefers-color-scheme` y variables CSS.
* Consulta el estado de guardado devuelto por el backend; muestra éxito solo cuando Power Automate confirme el guardado en Dataverse, informa errores o falta de confirmación y oculta el aviso después de 5 segundos.
* El estado de conexión inicia como "Sin verificar"; cambia a verde/"En línea" después de una respuesta correcta de Foundry y a rojo/"Sin conexión" si ocurre un error.
