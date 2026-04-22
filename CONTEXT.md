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
- **World Cup 2026:** Soporta modos "Posiciones" y "Partidos".
- **Champions League 2025/26:** Soporta modo "Partidos".

---

## Estructura de Páginas y Componentes
- **AppShell:** Layout común con navegación, selector de idioma y toggle de tema.
- **Home:** Dashboard con mis torneos, unirse por código, y creación rápida con **configuración de puntos personalizada integrada**.
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

## Roadmap / Estado del Proyecto
- [X] Configuración PWA e instalabilidad
- [X] i18n soporte para 11 idiomas
- [X] Admin Results Management (Carga de resultados reales)
- [X] Refinar Playoff Brackets (Mobile-ready)
- [X] Sistema de tie-break por `initial_position` en tablas de grupo
- [X] Pestañas de configuración de puntos (Creación + Edición) y reglas dinámicas
- [ ] Elegir e integrar API de resultados automáticos (API-Football)
- [ ] Implementar lógica de puntos automática en Supabase (Edge Functions / Triggers)
- [ ] Crear bot/ping para evitar pausa de Supabase Free
- [ ] Integración MercadoPago para quitar límites de torneos/jugadores
