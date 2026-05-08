# Roadmap y Gestión de Tareas (Prode Mundial)

Este archivo sirve como el roadmap activo del proyecto. Los agentes deben usar este listado para entender en qué trabajar a continuación, ir marcando las tareas (`[x]`) a medida que avanzan, y subdividir estas tareas en items más granulares si es necesario para tener claridad en el proceso.

**Nota:** Las tareas completadas han sido movidas a `CHANGELOG.md` para mantener este archivo limpio y escalable.

## Fase 1: Automatización de Resultados (API y Backend)

- [ ] **Elegir e integrar API de resultados automáticos (API-Football)**
  - [x] Investigar la documentación de API-Football para encontrar los endpoints relevantes de World Cup y Champions League.
  - [x] Desarrollar la integración para traer los resultados de **Champions League** en tiempo real (Edge Function `sync-ucl-results`).
  - [ ] Desarrollar la integración para los resultados del **Mundial 2026**.
  - [ ] Validar que los updates de la API no sobreescriban resultados manuales o funcionen de manera errónea.
- [ ] **Testing del cálculo automático**
  - [ ] Realizar testing extensivo en ambientes de prueba para asegurar que el cálculo de puntos y la sumatoria de la tabla de líderes se actualicen sin errores al recibir datos de la API.

## Fase 2: Mantenimiento e Infraestructura

- [ ] **Crear bot/ping para evitar pausa de Supabase Free**
  - [ ] Diseñar un bot, script web o trigger externo que realice una lectura / escritura en la base de datos de Supabase cada X tiempo (ej: 24 hs o 3 días) para mantener vivo el proyecto y evitar que entre en pause por inactividad.
- [ ] **Resolución de bugs o mantenimientos menores (sección abierta)**
  - [x] En mobile, mover `Configuración` y `Menú` del torneo a un desplegable bajo el icono de tres rayas, renombrando el acceso a `Más...` / `More...`.
  - *(Agrega aquí cualquier bug o detalle a corregir que encuentres)*

## Fase 3: Monetización e Integraciones Externas

- [ ] **Integración MercadoPago**
  - [ ] Explorar y definir la arquitectura de pagos (suscripción o pago por uso) para levantar los límites gratuitos de jugadores / torneos por cliente.
  - [ ] Implementar checkout y configuración de webhooks en Supabase para registrar ventas exitosas.
  - [ ] Modificar condicionalmente los límites en el backend y frontend (ej: deshabilitar el cap si el usuario pagó).

---

> **Nota para Agentes:** Cuando completen un ítem principal, generen y almacenen artefactos documentando lo logrado. Actualicen este archivo marcando con `[x]` y hagan un **commit atómico**. Si completan una fase entera o un grupo grande de features, muévanlas a `CHANGELOG.md` para mantener este roadmap escalable.
