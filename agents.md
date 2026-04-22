# Instrucciones para Agentes Autónomos

Este documento sirve como guía para cualquier agente de inteligencia artificial que trabaje en el proyecto **Prode Mundial**. 

## Objetivo Principal
Tu objetivo es operar como un desarrollador de software autónomo dentro de este proyecto, minimizando las interrupciones al usuario y priorizando la independencia y la proactividad.

## Reglas de Operación

1. **Contexto Primero:** 
   Siempre que inicies tu ejecución, revisa `CONTEXT.md` para entender de qué trata el proyecto, la arquitectura, el stack y el estado actual.

2. **Gestión de Tareas (`tasks.md`):**
   - Revisa `tasks.md` para identificar tu próxima tarea o para retomar el desglose de pasos en el que te encuentres.
   - A medida que vayas completando pasos, **VOS MISMO debes actualizar `tasks.md`** cambiando `[ ]` por `[x]`. 
   - Si una tarea es grande, divídela en sub-tareas dentro del mismo archivo `tasks.md` para tener un check-list granular de tu proceso.
   - Pasa automáticamente al siguiente hito una vez terminado el anterior, sin pedir permiso al usuario.

3. **Flujo de Ejecución (Implementar -> Verificar -> Actualizar -> Commitear):**
   - **Implementa** el código de forma iterativa y metódica.
   - **Verifica** que funcione. Si haces cambios en la UI o en el flujo, levanta el proyecto (`npm run dev`) y genera **capturas de pantalla, grabaciones (browser recordings) o code diffs** usando las herramientas disponibles. 
   - **Actualiza** `CONTEXT.md` y `tasks.md` si agregaste features estructurales o si terminaste un elemento importante del roadmap.
   - **Haz commits** atómicos utilizando las herramientas de terminal para tener un historial claro cuando hayas terminado un step funcional.

4. **Documentación de Progreso (Artifacts):**
   - En lugar de detenerte a hacerle preguntas de clarificación al usuario tras pequeños avances, utiliza la creación de **Artifacts** (o los walkthroughs si estás en modo planificación) y herramientas como `generate_image`, para generar entregables o demostraciones en línea. Documenta lo que lograste antes de avanzar al siguiente punto.

5. **Condiciones de Detención:**
   - **Única y exclusivamente** te podrás detener y pedir acción/input por parte del usuario bajo las siguientes condiciones:
     1. Terminaste satisfactoriamente absolutamente toda la lista de trabajo activa en `tasks.md`.
     2. Encontraste un problema crónico de configuración, un error de compilación/dependencias, o un error fatal que NO lograste resolver de forma autónoma después de **al menos 3 intentos analíticos de debugging**.
     3. El flujo está 100% bloqueado y no hay posibilidad de seguir sin una credencial, una tarjeta de crédito o un input subjetivo del negocio imposible de deducir.

6. **Prioriza la Autonomía:**
   - Si hay una decisión de la interfaz o la arquitectura que no es clara pero una opción es intuitivamente mejor, toma el rumbo moderno y proyéctalo en la iteración, documentándolo al final. No pidas feedback intermedio a menos que rompa el contrato general.
