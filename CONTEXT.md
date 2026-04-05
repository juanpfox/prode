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
El usuario pronostica el **resultado exacto** de cada partido (goles de cada equipo con desplegables). En fase eliminatoria, si pronostica empate, se habilitan 2 desplegables extra para elegir ganador por penales.
- **Vistas:** Por Fecha (Date-based), Por Grupo (Group-based) y Playoffs (Bracket interactivo).
- **Auto-save:** Debounced saving al escribir resultados.

**Sistema de puntos** (editables por torneo):

| Situación | Default | Configurable |
|-----------|---------|:------------:|
| Ganador correcto | 0 | ✅ |
| Pronosticaste empate y acertás | 0 | ✅ |
| Pronosticaste empate y no acertás | 0 (sin penalidad) | — |
| Ganador incorrecto (no empate) | 0 (sin penalidad) | — |
| Resultado exacto (ambos goles) | +3 | ✅ |
| Goles exactos de un equipo | +1 por equipo (máx +2) | ✅ |
| Diferencia de goles correcta (legacy) | 0 | ✅ |
| Diferencia de goles incorrecta (legacy) | 0 | ✅ |
| **Bonus cercanía dif. de gol** | **+3** | ✅ |
| Victoria por penales correcta | ×2 al total del partido | ✅ |
| Derrota por penales | equivale a empate | — |

**Bonus cercanía diferencia de gol (nueva regla):**
```
bonus = points_goal_diff_proximity - abs(dif_pronosticada - dif_real)
```
Donde `dif = goles_local - goles_visitante` (con signo). Sin piso negativo.

Ejemplo: Resultado real Argentina 3 - Argelia 1 (dif_real = +2), base = 3:
- Pronóstico 2-0 o 3-1 (dif +2) → distancia 0 → **+3 pts**
- Pronóstico 1-0 (dif +1) → distancia 1 → **+2 pts**
- Pronóstico 4-0 (dif +4) o 2-2 (dif 0) → distancia 2 → **+1 pt**
- Pronóstico Argelia 1-0 (dif -1) → distancia 3 → **0 pts**
- Pronóstico Argelia 3-0 (dif -3) → distancia 5 → **-2 pts**

> Las reglas legacy de diferencia (+1/-1 por gol) se mantienen en 0 por defecto pero el owner puede activarlas. Ambas reglas se suman.

**Multiplicadores por fase** (editables):
| Fase | Mult. default |
|------|--------------|
| Fase de grupos | ×1 |
| 16avos | ×2 |
| 8avos | ×3 |
| Cuartos | ×4 |
| Semis | ×5 |
| Final | ×6 |
| 3°/4° puesto | ×1 (sin multiplicador) |

**Bloqueo:** 1 hora antes de **cada partido** individualmente. Los pronósticos de ese partido se vuelven visibles para todos a partir del kickoff.

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
