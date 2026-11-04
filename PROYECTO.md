# Mi Proyecto de IA - Javier Jacobo

## Prospectador de Clientes
### Power Platform + Copilot + Foundry

---

## 1. Problema

Softdev es una empresa Partner de Microsoft que comenzó operaciones hace un año como un emprendimiento de Javier Jacobo.

Actualmente busca nuevos clientes para ofrecer servicios de consultoría, desarrollo y soporte técnico utilizando Power Platform, Microsoft 365 y Copilot, además de aplicar los conocimientos adquiridos en el curso de IA del MOOC que cursa actualmente.

La empresa no cuenta con personal adicional, por lo que una sola persona realiza actividades administrativas, financieras y técnicas.

Además, la información se encuentra distribuida en diferentes repositorios como OneDrive, Teams y SharePoint, dificultando la gestión comercial y operativa.

---

## 2. Objetivo

Automatizar el ciclo completo de prospección comercial para Softdev, incrementando la eficiencia y reduciendo tareas manuales.

### Objetivos específicos

- Encontrar clientes potenciales.
- Analizar su presencia digital.
- Identificar oportunidades de negocio.
- Calificar prospectos encontrados.
- Generar correos personalizados.
- Gestionar el seguimiento desde una aplicación empresarial tipo CRM.

---

## 3. Arquitectura

```mermaid
flowchart TD
    A["Fuentes Externas<br/>LinkedIn, Web, Directorios, Bing"]
    B["Power Automate<br/>Recolección automática"]
    C["Dataverse<br/>Repositorio central MVP"]
    D["Azure AI Foundry<br/>Azure OpenAI<br/>Análisis y Scoring IA"]
    E["Copilot + Foundry<br/>Consultas y análisis conversacional"]
    F["Power Apps<br/>Gestión de Prospectos CRM"]
    G["Outlook y Teams<br/>Comunicación y seguimiento"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G

Componentes principales
Componente	FunciónFuentes Externas	Obtención de información de prospectos
Power Automate	Automatización de la captura y procesamiento
Dataverse	Almacenamiento central de información
Azure AI Foundry	Clasificación y análisis inteligente
Copilot + Foundry	Interacción conversacional con los datos
Power Apps	CRM para gestión comercial
Outlook y Teams	Comunicación y seguimiento
4. Restricciones
Utilizar únicamente tecnologías disponibles dentro de Microsoft 365 Basic.
No contar con presupuesto para adquirir licencias adicionales.
Disponibilidad menor a 20 horas por semana.
Encapsular la solución dentro del ecosistema Power Platform.
Utilizar únicamente servicios hospedados en Azure.
5. Principios de IA Responsable
Transparencia

Informar claramente cuándo la IA genera análisis, recomendaciones o contenido.

Privacidad

Utilizar únicamente datos autorizados y proteger la información de los prospectos.

Equidad

Evaluar prospectos mediante criterios objetivos, minimizando sesgos.

Supervisión Humana

Mantener la validación y decisión final bajo control humano.

Seguridad y Confiabilidad

Garantizar información precisa, segura y trazable.

Responsabilidad

Registrar y documentar todas las acciones realizadas por la solución.

Gobernanza

Cumplir con políticas de acceso, seguridad y uso responsable de la información.

Uso Responsable de IA Generativa

Validar los resultados antes de utilizarlos en procesos comerciales.

6. Plan de Trabajo

Fecha de inicio: 14 de septiembre de 2026
 Fecha de fin: 6 de noviembre de 2026

Fase	Periodo	Actividades Principales	Entregable1. Preparación y Análisis	14 sep - 20 sep	Definir alcance, arquitectura, modelo de datos y repositorios	Diseño base aprobado
2. Diseño de la Solución	21 sep - 27 sep	Diseñar tablas Dataverse, flujos y criterios de calificación	Diseño funcional
3. Desarrollo MVP	28 sep - 11 oct	Crear listas, Power Apps y automatizaciones iniciales	CRM básico operativo
4. Integración de IA	12 oct - 25 oct	Integrar Azure OpenAI para análisis y scoring de prospectos	Motor IA funcionando
5. Automatización Comercial	26 oct - 1 nov	Generación de correos, seguimiento e integración con Outlook y Teams	Flujo comercial automatizado
6. Pruebas y Ajustes	2 nov - 5 nov	Validación integral, corrección de errores y mejoras	MVP estabilizado
7. Go Live	6 nov	Documentación y puesta en producción	Solución operativa
7. Solución Propuesta

La solución estará compuesta por los siguientes componentes:

Aplicación CRM desarrollada en Power Apps.
Base de datos centralizada en Dataverse.
Automatizaciones mediante Power Automate Cloud.
Análisis inteligente utilizando Azure OpenAI.
Dashboard ejecutivo implementado en Power BI.
Agente en Azure AI Foundry para consulta conversacional de prospectos.
Procesamiento de prospectos reales dentro de la plataforma.
Resultado Esperado

Una plataforma integrada capaz de:

Capturar prospectos automáticamente.
Analizarlos mediante inteligencia artificial.
Clasificarlos según potencial comercial.
Gestionar el seguimiento comercial desde un CRM.
Automatizar comunicaciones.
Centralizar información y métricas para la toma de decisiones.
Tecnologías Utilizadas
Microsoft Power Apps
Microsoft Power Automate
Microsoft Dataverse
Microsoft 365
Microsoft Teams
Microsoft Outlook
Microsoft Copilot
Azure AI Foundry
Azure OpenAI Service

Un MVP funcional de prospección inteligente que permita a Softdev automatizar y escalar su proceso comercial utilizando tecnologías de Microsoft y capacidades de Inteligencia Artificial Responsable.
