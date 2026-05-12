# Prode Mundial — Proyecto Contexto

## Stack tecnológico
- **Frontend:** Vite + React JS (deployado en Cloudflare Pages)
- **Backend:** Supabase (Auth, PostgreSQL, Realtime, Edge Functions)
- **PWA:** `vite-plugin-pwa` — instalable y offline-ready
- **i18n:** `react-i18next` — 11 idiomas: `ar`, `bn`, `de`, `en`, `es`, `fr`, `hi`, `ja`, `ko`, `pt`, `zh`.
- **Data fetching:** TanStack Query
- **Styling:** Vanilla CSS con variables CSS (Modern design, glassmorphism, responsive grid)

## Supabase
- **Project ID:** `lnjiplzfsvtjiijpdoos`
- **Region:** South America (São Paulo)
- **Plan:** Free

---

## Descripción del producto
App multitorneo y multiusuario para el Mundial 2026 y Champions League. Diseñada para ser mobile-first/PWA, permitiendo a los usuarios crear torneos, invitar amigos y competir por puntos basados en predicciones.

### Competiciones activas
- **World Cup 2026:** Única competición disponible para creación de nuevos torneos. Soporta modos "Posiciones" y "Partidos".
- **Champions League 2025/26:** Soportada para torneos existentes (Modo "Partidos").

---

## Estructura de Páginas y Componentes
- **AppShell:** Layout común con navegación, selector de idioma y toggle de tema.
- **Home:** Dashboard con mis torneos, y creación rápida con **configuración de puntos personalizada integrada**.
- **Tournament Detail:** Leaderboard, gestión de jugadores (admin) y pestañas dinámicas de "Scoring" y "Rules".
- **Predictions (Partidos):** Carga de resultados con vistas por Fecha, Grupo y Playoff Bracket (responsivo).
- **Predictions (Posiciones):** Drag & drop para ordenar grupos y podio final.
- **Admin Management:** Páginas especiales para que los superadmins carguen resultados reales.

---

## Reglas y Puntuación (Configurables por torneo)

El creador del torneo elige los puntos y multiplicadores durante el proceso de **creación**, pudiendo editarlos luego en la pestaña de configuración.

### Modo Posiciones
El usuario pronostica el **orden final de cada equipo en su grupo** y el **podio mundial**.
- **Puntos:** Exact position, semifinalist, finalist, champion bonus.
- **Multiplicadores:** Aplicables según la posición final (1°, 2°, 3°) y fase alcanzada.
- **Tie-break:** En las tablas de posiciones (UI), se usa `initial_position` de la tabla `teams` como criterio de desempate final.

### Modo Partidos
Pronóstico de **resultado exacto**.
- **Puntos base:** Ganador correcto, empate acertado, resultado exacto, diferencia de gol (per goal).
- **Multiplicadores por fase:** Grupos (x1), 16avos (x2), 8avos (x3), Cuartos (x4), Semis (x5), Final (x6) — configurables por el admin del torneo.
- **Penales:** En eliminatorias, si se predice empate, se habilita el selector de "Ganador por penales".

---

## Reliability — Defensive Boot Pattern

La app está hardenada contra el failure mode **"pantalla en blanco"** (típico en Safari iOS después de deploys, con caché/SW stale, o con storage bloqueado). Defensa en capas:

1. **Boot watchdog (`index.html`):** timer de 10s; si React no monta, se muestra fallback localizado con botón **"Recargar limpio"** (`window.__bustAndReload`) que desregistra Service Workers, limpia `caches` y recarga con cache-bust.
2. **Pre-bundle error buffer:** `window.__bootErrors` captura `error` y `unhandledrejection` antes de que cargue el bundle. `main.jsx` los flushea a Sentry al iniciar.
3. **`vite:preloadError` auto-recovery (`main.jsx`):** si un dynamic import apunta a un chunk que ya no existe (deploy de Cloudflare en una tab vieja), recargamos una vez con `window.__bustAndReload`. `sessionStorage['chunk-reload']` evita loops.
4. **Sentry error boundary** envuelve el árbol con `AppErrorFallback` (Reintentar + Recargar limpio + eventId visible).
5. **Safe storage en `lib/supabase.js`:** wrapper que cae a `Map` en memoria si `localStorage` tira (Safari modo privado, ITP, "Block all cookies"). Supabase auth nunca crashea en init.
6. **`vite.config.js` build target explícito:** `safari15, chrome90, firefox90, edge90, es2020`. El default de Vite 7 (`baseline-widely-available`) excluye Safari < 16.4 y fue la **causa raíz** del bug original en iPhone 12 con iOS 15.
7. **Workbox `cleanupOutdatedCaches: true`:** evita que un dispositivo mezcle precaches de versiones distintas del SW.
8. **i18n:** keys `errors.crash.{title,body,retry,reload}` en los 11 locales.

### Telemetría — qué mirar en Sentry
- `event.message:boot:*` → errores capturados antes del bundle. Filtrar por `os.name:iOS` y `browser.version` para detectar patrones por dispositivo/SO.
- `event.message:"vite:preloadError"` → indica deploys frecuentes contra tabs viejas; el auto-reload los está atrapando.

### Cuándo extender este patrón
- Si aparecen muchos `boot:timeout` con `os.version:14.*` → agregar `@vitejs/plugin-legacy`.
- Si Sentry recibe pocos `boot:*` events pero hay reportes de pantalla blanca → considerar un endpoint beacon en Edge Function porque el bundle no llegó a inicializar Sentry.

### ⚠️ Requisito de configuración
- `VITE_SENTRY_DSN` debe estar definido en **Cloudflare Pages → Settings → Environment Variables (Production)**. Sin DSN, Sentry queda deshabilitado y la telemetría no se ve.

---

## Roadmap / Estado del Proyecto

Para mantener este documento escalable, el detalle de las tareas se maneja en archivos separados:
- **Tareas pendientes y roadmap activo:** Ver `tasks.md`.
- **Historial de logros y tareas completadas:** Ver `CHANGELOG.md`.

*Features principales ya implementadas:*
- PWA e instalabilidad, i18n (11 idiomas).
- Lógica completa de torneos, predicciones y cálculo de puntos (modos Posiciones y Partidos).
- Avatares personalizados y URLs únicas (slugs) para torneos.

---

## Testing / Accesos Directos
Para facilitar las pruebas en desarrollo local, existen rutas de acceso directo que inician sesión automáticamente como usuarios de prueba:
- **`/guest`**: Inicia sesión como `guest` (Admin).
- **`/guest2`**: Inicia sesión como `guest2` (Admin).
