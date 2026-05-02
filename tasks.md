# Roadmap y Gestión de Tareas (Prode Mundial)

Este archivo sirve como el roadmap activo del proyecto. Los agentes deben usar este listado para entender en qué trabajar a continuación, ir marcando las tareas (`[x]`) a medida que avanzan, y subdividir estas tareas en items más granulares si es necesario para tener claridad en el proceso.

## Fase 1: Automatización de Resultados (API y Backend)

- [ ] **Elegir e integrar API de resultados automáticos (API-Football)**
  - [x] Investigar la documentación de API-Football (o la API elegida) para encontrar los endpoints relevantes de World Cup y Champions League.
  - [x] Desarrollar la integración para traer los resultados de **Champions League** en tiempo real y poblar la base de datos de Supabase (Edge Function `sync-ucl-results`).
  - [ ] Desarrollar la integración para los resultados del **Mundial 2026**.
  - [ ] Validar que los updates de la API no sobreescriban resultados de manera errónea.
- [x] **Implementar lógica de puntos automática en Supabase / Backend**
  - [x] Configurar un webhook o proceso periódico (Edge Functions / Cron) para obtener los resultados finales (Activo vía GitHub Actions para UCL).
  - [x] Diseñar y programar los triggers de base de datos o lógica serverless para que, al actualizarse el resultado real de un partido, se calculen los puntos automáticamente (`recalculate_all_scores_for_competition`).
  - [x] Desarrollar la lógica de cálculo de puntos para torneos modo "Posiciones" y acoplarlo al botón "Recalcular pts".
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
  - [x] **Vista Grupos: Página de Mejores Terceros**
    - [x] Agregar botón "3º" después del Grupo L (en `PredictionsPage` y `PlayerPredictionsPage`).
    - [x] Implementar lógica de cálculo para el ranking de terceros (puntos, dif, goles).
    - [x] Mostrar tablas de Pronóstico y Real con línea divisoria (cutoff) en la 8ª posición.
    - [x] Sincronizar cambios en la vista de otros jugadores (`PlayerPredictionsPage.jsx`).
    - [x] Actualizar traducciones.
  - [x] **Limpiar fichas de torneos**
    - [x] Eliminar nombre de competición y modo de juego en `TournamentCard.jsx`.
    - [x] Eliminar nombre de competición y modo de juego en el header de `TournamentDetailPage.jsx`.
  - [x] **Bug Fix: Cloudflare Deployment Failure (PWA Assets Limit)**
    - [x] Identificar el error de límite de tamaño de archivos en `vite-plugin-pwa` mediante los logs de Cloudflare.
    - [x] Aumentar `maximumFileSizeToCacheInBytes` a 10MB en `vite.config.js` para permitir el precacheo de sprites de avatares e imágenes de branding.
    - [x] Verificar el build localmente.
  - [x] **Bug Fix: Tournament Config Page empty**
    - [x] Fix ReferenceError in `TournamentDetailPage.jsx` by defining the `id` variable correctly at the component level.
  - [x] **Bug Fix: Equipos reales en bracket de playoffs**
    - [x] Modificar `simulatorWC2026.js` para que, cuando un partido de playoff ya tiene resultado real cargado en la DB, use los equipos reales (`home_team`/`away_team`) en lugar de calcularlos desde las predicciones del usuario.
    - [x] Modificar `simulatorUCL.js` para que el partido final de UCL use los equipos reales de la DB cuando están disponibles, y `areSFsResolved` retorne true cuando el final ya tiene equipos asignados.
    - [x] Fix: el simulador WC ya no bloquea el bracket completo cuando no hay predicciones de grupos, siempre que existan resultados reales de playoffs.
    - [x] Fix: pasar `tournament` y `sfResolved` como props a `BracketTree` en `PredictionsPage.jsx` (bug pre-existente de scope).
    - [x] **Bug Fix: Guest Routing & 406 Error**
      - [x] Corregir colisión de rutas entre `/guest` y `/:slug` en `App.jsx`.
      - [x] Cambiar `.single()` por `.maybeSingle()` en `TournamentDetailPage.jsx` para evitar errores 406 cuando no se encuentra un torneo.
  - [x] **Tooltip de cálculo de puntos en pronósticos**
    - [x] Modificar `calcMatchPoints` para devolver el desglose del cálculo.
    - [x] Crear componente CSS de tooltip en `index.css`.
    - [x] Implementar el tooltip en `PredictionsPage.jsx` y `PlayerPredictionsPage.jsx` al pasar el mouse por los puntos de cada ficha.
  - [x] **Ajustes en pantalla de creación de torneo**
    - [x] Swappear orden de modos: Partidos a la izquierda, Posiciones a la derecha. (Descartado: se ocultó el selector).
    - [x] Ocultar selector de modo de juego (forzado a "Partidos" por defecto).
    - [x] Actualizar descripción de modo Privado: "Solo usuarios con el link directo pueden verlo y unirse".
  - [x] **Limpieza de resultados World Cup 2026**
    - [x] Borrar absolutamente todos los resultados cargados de la competición.
  - [x] **Traducción: Corregir label "My tournaments" en TournamentsPage**
    - [x] Agregar `tab_mine` en `es.json` y verificar consistencia.
  - [x] **Pestaña "Unirme a otro torneo"**
    - [x] Reemplazar label "Todos" por "Unirme a otro torneo" en `es.json` y `en.json`.
    - [x] Filtrar lista de torneos públicos para excluir aquellos en los que el usuario ya participa.
    - [x] Mantener "Mis torneos" con solo los aprobados mientras se excluyen todos los unidos de la lista pública.

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
- [x] **Home Page: Mejorar onboarding para nuevos usuarios**
  - [x] Ocultar email en el dashboard cuando no hay torneos.
  - [x] Reemplazar título "Todos" por "Elegí el torneo en el que querés jugar" (i18n).
  - [x] Ocultar sección "Mis Torneos" y estado vacío cuando el usuario no participa en nada todavía.
- [x] **Crear usuario de prueba guest2**
  - [x] Crear cuenta `guest2@prodemundial.dev` en Supabase Auth y perfil en public.
  - [x] Implementar ruta `/guest2` para login automático sin contraseña.
  - [x] Otorgar permisos de admin a guest2.
- [x] **Sub-URLs personalizadas para torneos (Slugs)**
  - [x] Migración DB: agregar columna `slug` única y con validación regex.
  - [x] Traducciones: agregar labels y errores para el campo slug.
  - [x] UI Creación: agregar campo slug con validación en tiempo real y auto-completado desde el nombre.
  - [x] UI Configuración: rediseño según mockup con botón de copiar URL y preview dinámico.
  - [x] Routing: soportar rutas dinámicas `/:slug`, `/:slug/pronosticos`, etc.
  - [x] Navegación: actualizar links para usar el slug si existe.
  - [x] Validación: prevenir uso de palabras reservadas como slugs.
  - [x] Disponibilidad: verificar en tiempo real si el slug está en uso y ofrecer sugerencias.
  - [x] Asegurar que las redirecciones y links usen el slug cuando esté disponible.
  - [x] **Descartar códigos de invitación y priorizar URL**
    - [x] Reemplazar botón "Invitar" por "Copiar invitación" en toda la app.
    - [x] Implementar copiado de mensaje con URL (tipo Zoom).
    - [x] Eliminar display de códigos de invitación y campos de ingreso por código.
    - [x] Actualizar traducciones (ES, EN, PT, FR, DE).
- [x] **Sincronización de predicciones multitorneo**
  - [x] Implementar barra de sincronización en `PredictionsPage`.
  - [x] Permitir copiar predicciones desde/hacia otros torneos de la misma competición.
  - [x] Soportar guardado automático en todos los torneos hermanos (toggle "Guardar en todos").
- [x] **Página de inicio predeterminada: Torneos**
  - [x] Cambiar la ruta raíz `/` para que renderice `TournamentsPage.jsx` en lugar de `HomePage.jsx`.
  - [x] Actualizar la navegación en `AppShell.jsx` para que el botón de Torneos apunte a `/` y se marque como activo.
  - [x] Redirigir `/torneos` a `/` para unificar la URL.
  - [x] **Mejora Onboarding: Usuario sin torneos**
    - [x] Ocultar pestañas "Mis torneos" y "Unirme a otro" si la lista de torneos propios está vacía.
    - [x] Mostrar mensaje "Elegí el torneo al que queres unirte" como título.
    - [x] Mostrar lista de torneos públicos directamente.

## Fase 5: Perfil y Personalización

  - [x] **Sistema de Avatares Personalizados**
    - [x] Generar catálogo de imágenes (Personas, Animales, Jugadores, Clubes, Famosos).
    - [x] Crear componente `AvatarSelector`.
  - [x] **✅ 2.2. Penalización por empate fallido en goles (Modo Partidos)**
    - [x] **Objetivo:** Implementar la regla de "descuento por diferencia de goles" al acertar un empate, con límite inferior de 1 punto.
    - [x] Agregar `pts_descuento_empate` (default 1) a `tournament_config`.
    - [x] Modificar la lógica de recálculo en la DB (`recalculate_scores_for_match` y `recalculate_tournament_scores`) para aplicar el descuento con `Math.max(1, pts_empate - (pts_descuento_empate * abs(dif_goles)))`.
    - [x] Incluir la variable en `SCORING_DEFAULTS` y en `ConfigTab.jsx` (`MATCH_FIELDS`).
    - [x] Mostrar el descuento en el componente de simulación de puntos en creación, configuración y reglas.
    - [x] Actualizar `es.json` y `en.json` con las nuevas etiquetas de traducción.
    - [x] Sincronizar tooltips de puntos en `PredictionsPage.jsx` y `PlayerPredictionsPage.jsx`.
  - [x] Implementar la lógica de selección en la edición de perfil.
  - [x] Asegurar que el avatar se muestre en los rankings y perfiles de usuario.
  - [x] Agregar celebs2.png a la categoría de Famosos.
  - [x] Validar dimensiones (1x1) y estilo caricaturesco.
  - [x] **Bug Fix: Centrado de Avatares**
    - [x] Ajustar `background-size` y `transform: scale` para centrar perfectamente los iconos y eliminar bordes sangrantes en todas las categorías.
  - [x] **Redirección post-login a la URL de origen**
    - [x] Modificar `useAuth.jsx` para permitir pasar una ruta de redirección en `signInWithEmail` y `signInWithGoogle`.
    - [x] Actualizar `LoginPage.jsx` para capturar la ruta actual y pasarla al iniciar sesión.
    - [x] Verificar que al entrar a un torneo sin sesión, luego de loguearse se mantenga en ese torneo.
  - [x] **Rediseño: Hero de Página de Inicio**
    - [x] Reemplazar título, subtítulo y badge por la imagen `prodeImage.png`.
    - [x] Ajustar estilos CSS para asegurar responsividad y visualización premium.
  - [x] **Avatares para Torneos**
    - [x] Agregar columna `avatar_url` (o similar) a la tabla `tournaments`.
    - [x] Integrar `AvatarSelector` en el flujo de creación de torneos.
    - [x] Integrar `AvatarSelector` en la configuración del torneo.
    - [x] Asegurar que el avatar se visualice en las `TournamentCard` y en el detalle del torneo.
    - [x] Filtrar categorías de avatares para torneos (usar `teams`, `others` and `animals`).
    - [x] Usar el avatar de trofeo (others:1) como placeholder por defecto para torneos sin avatar.

- [x] **Countdown al Mundial 2026**
  - [x] Crear componente `WorldCupCountdown` con lógica de tiempo real.
  - [x] Implementar diseño premium con glassmorphism según mockup.
  - [x] Agregar el contador a la página de Login.
  - [x] Agregar el contador a la página de Inicio (Home).
  - [x] Soportar i18n para los labels del contador.
- [x] **Mover selección de avatar a página separada**
  - [x] Crear la página `AvatarPage.jsx` en `src/pages`.
  - [x] Registrar la ruta `/perfil/avatar` en `App.jsx`.
  - [x] Modificar `ProfilePage.jsx` para quitar el selector directo y agregar un link en el avatar y uno debajo.
  - [x] Implementar autoguardado al seleccionar un avatar y eliminar botones manuales.
  - [x] Asegurar que la nueva página permita seleccionar el avatar y guardarlo automáticamente.
  - [x] Replicar la misma lógica (click-to-open y autoguardado inline) para la creación y configuración de Torneos.
- [x] **Limpieza de Home y Countdown en Top Bar**
  - [x] Eliminar la visualización del correo electrónico en la página de inicio.
  - [x] Mover el contador del mundial al top bar (AppShell) en formato reducido/compacto.
  - [x] Eliminar el contador grande de la página de inicio.
- [x] **Mejora Navegación: Botón Volver en página Jugador**
  - [x] Cambiar destino del botón volver de `/posiciones` a la página del torneo.
  - [x] Mostrar el nombre del torneo en el label del botón (ej: `← Torneo Guest`).
  - [x] Sincronizar comportamiento con la página de Pronósticos propia.
- [x] **Rediseño Login: Layout Desktop**
  - [x] Agrupar contador y card de login en contenedor lateral.
  - [x] Implementar layout de dos columnas en escritorio (Imagen a la izquierda, login a la derecha).
  - [x] Ajustar responsividad para tablets y móviles.
- [x] **Avatar por defecto para usuarios**
  - [x] Modificar el componente `Avatar` para que use el emoji 👤 como fallback si no hay avatar seleccionado.
  - [x] Ajustar el CSS de `avatar-placeholder` para que el tamaño del emoji sea responsivo.
  - [x] Aplicar fondo gris claro al círculo del avatar por defecto para asegurar visibilidad en modo oscuro.
  - [x] Actualizar la base de datos para establecer 👤 como valor por defecto en la columna `avatar_url` de la tabla `users`.
  - [x] Actualizar a los usuarios existentes que no tenían avatar elegido.
  - [x] **Bug Fix: Avatares desapareciendo en Producción**
    - [x] Corregir lógica de detección de sprites para evitar que URLs externas (Google) se procesen como sprites inválidos.
    - [x] Modificar trigger de base de datos para priorizar el emoji 👤 sobre la foto de perfil de Google en nuevos registros.
    - [x] Limpiar URLs de perfiles existentes para unificar la visualización inicial.


---

> **Nota para Agentes:** Cuando completen un ítem principal, generen y almacenen artefactos (capturas de pantalla, grabaciones de browser, diffs de código o walkthroughs) resumiendo los logros, actualicen este archivo y **hagan un commit atómico** de los cambios antes de pasar al próximo hito.
