# Prode Mundial — Contexto del Proyecto

## Stack tecnológico
- **Frontend:** Vite + React JS, desplegado en Cloudflare Pages (subdominio `.pages.dev`)
- **Backend:** Supabase (Auth + PostgreSQL + RLS + Realtime + Edge Functions)
- **PWA:** `vite-plugin-pwa` — instalable en iOS/Android como app nativa
- **i18n:** `react-i18next` — 12 idiomas soportados: `ar`, `bn`, `de`, `en`, `es`, `fr`, `hi`, `ja`, `ko`, `pt`, `zh`.
- **Data fetching:** TanStack Query
- **Styling:** Vanilla CSS (Modern design system, glassmorphism, responsive grid)

## Supabase
- **Project ID:** `lnjiplzfsvtjiijpdoos`
- **Project URL:** `https://lnjiplzfsvtjiijpdoos.supabase.co`
- **Región:** South America (São Paulo)
- **Plan:** Free

---

## Descripción del producto

App de prode (quiniela) para el Mundial 2026 y Champions League, multitorneo y multiusuario. Cualquier usuario puede crear torneos e invitar amigos. Pensada para ser responsive y funcionar como PWA (principalmente mobile).

### Competiciones activas
| Competición | Modos disponibles |
|-------------|------------------|
| World Cup 2026 | Posiciones + Partidos |
| Champions League 2025/26 (beta) | Partidos únicamente |

---

## Estructura de Páginas
- **Home:** Dashboard principal con acceso a torneos y creación rápida.
- **Tournaments:** Listado de torneos públicos y gestión de solicitudes.
- **Tournament Detail:** Vista general del torneo, ranking y configuración.
- **Predictions:** Carga de resultados con modos (Fechas, Grupos, Playoffs).
- **Posiciones:** Predicción de posiciones finales de grupo y podio mundial.
- **Leaderboard:** Ranking detallado del torneo.
- **Profile:** Gestión de perfil de usuario (Header).
- **Admin Resultados:** Interfaz para cargar resultados reales (restringido).

---

## Modos de juego

### Modo Posiciones (solo Mundial)
El usuario pronostica la **posición final de cada equipo en su grupo** (1°-4°) y el **podio mundial** (campeón, subcampeón, 3°, 4°).
**UI:** Grid responsivo con drag & drop y tablas dinámicas de posiciones.

### Modo Partidos (Mundial + Champions)
El usuario pronostica el **resultado exacto**.
- **Vistas:** Por Fecha (Date-based), Por Grupo (Group-based) y Playoffs (Bracket interactivo).
- **Auto-save:** Debounced saving al escribir resultados.

---

## Sistema de torneos
- Los creadores son admins y pueden aprobar/rechazar jugadores.
- Límites: 10 jugadores/torneo, 4 torneos/usuario (ampliable vía pagos).
- El perfil de usuario se encuentra en el Header superior.

---

## Pendientes / próximos pasos
- [X] Crear repo GitHub (`prode-mundial`)
- [X] UI Base y navegación responsiva
- [X] Implementar Admin Results Management (Carga de resultados reales)
- [X] Refinar Playoff Brackets y Posiciones Grid
- [X] Soporte multi-idioma expandido (12 locales)
- [ ] Elegir e integrar API de resultados automáticos (API-Football vs footbal-data.org)
- [ ] Crear bot/ping para evitar pausa de Supabase Free
- [ ] Habilitar Supabase Realtime en tabla `scores`
- [ ] Implementar lógica de cálculo de puntos en Edge Functions / Triggers
- [ ] Integración MercadoPago Checkout
