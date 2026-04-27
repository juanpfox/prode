# Roadmap y Gestión de Tareas (Prode Mundial)

Este archivo sirve como el roadmap activo del proyecto. Los agentes deben usar este listado para entender en qué trabajar a continuación, ir marcando las tareas (`[x]`) a medida que avanzan, y subdividir estas tareas en items más granulares si es necesario para tener claridad en el proceso.

## Fase 1: Automatización de Resultados (API y Backend)

- [ ] **Elegir e integrar API de resultados automáticos (API-Football)**
  - [x] Investigar la documentación de API-Football (o la API elegida) para encontrar los endpoints relevantes de World Cup y Champions League.
  - [x] Desarrollar la integración para traer los resultados de **Champions League** en tiempo real y poblar la base de datos de Supabase (Edge Function `sync-ucl-results`).
  - [ ] Desarrollar la integración para los resultados del **Mundial 2026**.
  - [ ] Validar que los updates de la API no sobreescriban resultados de manera errónea.
- [ ] **Implementar lógica de puntos automática en Supabase**
  - [x] Configurar un webhook o proceso periódico (Edge Functions / Cron) para obtener los resultados finales (Activo vía GitHub Actions para UCL).
  - [x] Diseñar y programar los triggers de base de datos o lógica serverless para que, al actualizarse el resultado real de un partido, se calculen los puntos automáticamente (`recalculate_all_scores_for_competition`).
  - [ ] Realizar testing extensivo en ambientes de prueba para asegurar que el cálculo de puntos y la sumatoria de tabla de líderes se actualicen sin errores.

## Fase 2: Mantenimiento e Infraestructura

- [ ] **Crear bot/ping para evitar pausa de Supabase Free**
  - [ ] Diseñar un bot, script web o trigger externo que realice una lectura / escritura en la base de datos de Supabase cada X tiempo (ej: 24 hs o 3 días) para mantener vivo el proyecto y evitar que entre en pause por inactividad.
- [ ] **Resolución de bugs o mantenimientos menores (sección abierta)**
  - [X] Mostrar todas las fases de playoffs (R32 a Final + 3er puesto) simultáneamente en vista desktop.
  - [X] Expandir el ancho del contenedor en escritorio (1600px) para la vista de PlayOffs.
  - [x] Eliminar botón "Entrar como invitado" de la página de inicio.
  - [x] **Bug Fix: Tournament Creation Scoring Buttons**
    - [x] Corregir botones + y - en `ConfigTab.jsx` para que no disparen el submit del form de creación.
  - [x] **Bug Fix: Rules Tab Example**
    - [x] Corregir interpolación de variables y claves faltantes en el ejemplo de cálculo.
  - [x] **Simplificar creación de torneos: Solo World Cup**
    - [x] Eliminar selector de competición en el form de creación.
    - [x] Forzar `competition_id` a World Cup 2026 por defecto.
  - [x] **Mejora de Ranking: Mostrar participantes con 0 puntos**
    - [x] Modificar `TournamentDetailPage.jsx` y `LeaderboardPage.jsx` para incluir a todos los jugadores aprobados en la tabla de puntos, inicializando en 0 si no hay registros.
  - [x] **Renombrar "Ranking" a "Posiciones"**
    - [x] Actualizar traducciones en `es.json` y `pt.json`.
    - [x] Cambiar la ruta `/ranking` por `/posiciones` en `App.jsx` y links de navegación.
    - [x] Actualizar comentarios y labels hardcodeados.
  - [x] **Vista Grupos: Agregar tabla de Posiciones Real**
    - [x] Implementar cálculo de tabla basado en resultados reales en `PredictionsPage.jsx`.
    - [x] Mostrar ambas tablas (Pronóstico y Real) con sus respectivos títulos.
    - [x] Actualizar traducciones.


  - [x] **Bug Fix: Equipos reales en bracket de playoffs**
    - [x] Modificar `simulatorWC2026.js` para que, cuando un partido de playoff ya tiene resultado real cargado en la DB, use los equipos reales (`home_team`/`away_team`) en lugar de calcularlos desde las predicciones del usuario.
    - [x] Modificar `simulatorUCL.js` para que el partido final de UCL use los equipos reales de la DB cuando están disponibles, y `areSFsResolved` retorne true cuando el final ya tiene equipos asignados.
    - [x] Fix: el simulador WC ya no bloquea el bracket completo cuando no hay predicciones de grupos, siempre que existan resultados reales de playoffs.
    - [x] Fix: pasar `tournament` y `sfResolved` como props a `BracketTree` en `PredictionsPage.jsx` (bug pre-existente de scope).

## Fase 3: Monetización e Integraciones Externas

- [ ] **Integración MercadoPago**
  - [ ] Explorar y definir la arquitectura de pagos (suscripción o pago por uso) para levantar los límites gratuitos de jugadores / torneos por cliente.
  - [ ] Implementar checkout y configuración de webhooks en Supabase para registrar ventas exitosas.
  - [ ] Modificar condicionalmente los límites en el backend y frontend (ej: deshabilitar el cap).

## Fase 4: Experiencia de Usuario y Destacados

- [x] **Torneos Destacados (Featured Tournaments)**
  - [x] Agregar columna `is_featured` a la tabla `tournaments`.
  - [x] Implementar el toggle de estrella en `TournamentCard` (solo para admins de la app).
  - [x] Actualizar la lógica de `HomePage` para mostrar torneos destacados primero para usuarios nuevos.
  - [x] Asegurar que el orden de los torneos respete la categoría de destacados.

---

> **Nota para Agentes:** Cuando completen un ítem principal, generen y almacenen artefactos (capturas de pantalla, grabaciones de browser, diffs de código o walkthroughs) resumiendo los logros, actualicen este archivo y **hagan un commit atómico** de los cambios antes de pasar al próximo hito.
