# Roadmap y Gestión de Tareas (Prode Mundial)

Este archivo sirve como el roadmap activo del proyecto. Los agentes deben usar este listado para entender en qué trabajar a continuación, ir marcando las tareas (`[x]`) a medida que avanzan, y subdividir estas tareas en items más granulares si es necesario para tener claridad en el proceso.

## Fase 1: Automatización de Resultados (API y Backend)

- [ ] **Elegir e integrar API de resultados automáticos (API-Football)**
  - [ ] Investigar la documentación de API-Football (o la API elegida) para encontrar los endpoints relevantes de World Cup y Champions League.
  - [ ] Desarrollar la integración para traer los resultados en tiempo real y poblar la base de datos de Supabase.
  - [ ] Validar que los updates de la API no sobreescriban resultados de manera errónea.
- [ ] **Implementar lógica de puntos automática en Supabase**
  - [ ] Configurar un webhook o proceso periódico (Edge Functions / Cron) para obtener los resultados finales.
  - [ ] Diseñar y programar los triggers de base de datos o lógica serverless para que, al actualizarse el resultado real de un partido, se calculen los puntos automáticamente basándose en las predicciones de los usuarios (considerando el multiplicador de la fase del torneo).
  - [ ] Realizar testing extensivo en ambientes de prueba para asegurar que el cálculo de puntos y la sumatoria de tabla de líderes se actualicen sin errores.

## Fase 2: Mantenimiento e Infraestructura

- [ ] **Crear bot/ping para evitar pausa de Supabase Free**
  - [ ] Diseñar un bot, script web o trigger externo que realice una lectura / escritura en la base de datos de Supabase cada X tiempo (ej: 24 hs o 3 días) para mantener vivo el proyecto y evitar que entre en pause por inactividad.
- [ ] **Resolución de bugs o mantenimientos menores (sección abierta)**
  - [X] Auto-completar bracket de playoffs en base a predicciones de grupos (495 combinaciones FIFA)
  - [ ] (Añadir aquí sub-tareas de mantenimiento a medida que surjan).

## Fase 3: Monetización e Integraciones Externas

- [ ] **Integración MercadoPago**
  - [ ] Explorar y definir la arquitectura de pagos (suscripción o pago por uso) para levantar los límites gratuitos de jugadores / torneos por cliente.
  - [ ] Implementar checkout y configuración de webhooks en Supabase para registrar ventas exitosas.
  - [ ] Modificar condicionalmente los límites en el backend y frontend (ej: deshabilitar el cap).

---

> **Nota para Agentes:** Cuando completen un ítem principal, generen y almacenen artefactos (capturas de pantalla, grabaciones de browser, diffs de código o walkthroughs) resumiendo los logros, actualicen este archivo y **hagan un commit atómico** de los cambios antes de pasar al próximo hito.
