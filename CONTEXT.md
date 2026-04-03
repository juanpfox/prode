# Prode Mundial — Contexto del Proyecto

## Stack tecnológico
- **Frontend:** Vite + React JS, desplegado en Cloudflare Pages (subdominio `.pages.dev`, sin dominio propio)
- **Backend:** Supabase (Auth + PostgreSQL + RLS + Realtime + Edge Functions)
- **PWA:** `vite-plugin-pwa` — instalable en iOS/Android como app nativa
- **Pagos futuros:** MercadoPago Checkout (no activo aún)
- **i18n:** `react-i18next` — español, portugués, inglés (estructura preparada desde el inicio)
- **Data fetching:** TanStack Query

## Supabase
- **Project ID:** `lnjiplzfsvtjiijpdoos`
- **Project URL:** `https://lnjiplzfsvtjiijpdoos.supabase.co`
- **Región:** South America (São Paulo)
- **Plan:** Free

> ⚠️ Plan Free pausa la base tras 1 semana de inactividad. Pendiente: crear bot/ping para evitar pausa.

---

## Descripción del producto

App de prode (quiniela) para el Mundial 2026 y Champions League, multitorneo y multiusuario. Cualquier usuario puede crear torneos e invitar amigos. Pensada para ser responsive y funcionar como PWA (principalmente mobile).

### Competiciones activas
| Competición | Modos disponibles |
|-------------|------------------|
| World Cup 2026 | Posiciones + Partidos |
| Champions League 2025/26 (beta) | Partidos únicamente |

---

## Modos de juego

### Modo Posiciones (solo Mundial)
El usuario pronostica la **posición final de cada equipo en su grupo** (1°-4°) y el **podio mundial** (campeón, subcampeón, 3°, 4°).

**Multiplicadores por posición** (editables por torneo):
| Posición pronosticada | Mult. default |
|----------------------|--------------|
| 3° del grupo | ×1 |
| 2° del grupo | ×2 |
| 1° del grupo | ×3 |
| 4° del mundial | ×4 |
| 3° del mundial | ×5 |
| Subcampeón | ×6 |
| Campeón | ×7 |

**Regla clave de multiplicadores:** Si un equipo tiene world_position asignada (top 4), ese multiplicador reemplaza al de grupo y se aplica a TODOS los partidos del equipo en todo el mundial. Solo hay un multiplicador activo por equipo.

**Puntos por resultado de partido** (editables):
| Resultado | Puntos base |
|-----------|------------|
| Victoria normal | 3 |
| Victoria por penales | 2 |
| Empate / Derrota por penales | 1 |
| Derrota normal | 0 |

**Fórmula:** `puntos_partido × multiplicador_activo_del_equipo`

**Puntos por acierto de posición** (editables, acumulables):
| Acierto | Puntos default |
|---------|---------------|
| Posición exacta en grupo (por equipo) | 10 |
| Semifinalista acertado | 10 |
| Finalista acertado | +20 (acumula sobre semi) |
| Campeón acertado | +30 (acumula sobre los anteriores = 60 total) |

**Bloqueo:** 1 hora antes del primer partido del mundial. Desde ese momento los pronósticos son públicos y no editables.

**UI del formulario:** Tabla visual de grupos con drag & drop de equipos (fichas) dentro de cada grupo.

---

### Modo Partidos (Mundial + Champions)
El usuario pronostica el **resultado exacto** de cada partido (goles de cada equipo con desplegables). En fase eliminatoria, si pronostica empate, se habilitan 2 desplegables extra para elegir ganador por penales.

**Sistema de puntos** (editables por torneo):

| Situación | Puntos |
|-----------|--------|
| Ganador correcto | +3 |
| Pronosticaste empate y acertás | +3 |
| Pronosticaste empate y no acertás | 0 (sin penalidad) |
| Ganador incorrecto (no empate) | 0 (sin penalidad) |
| Resultado exacto (ambos goles) | +3 adicionales |
| Goles exactos de un equipo | +1 por equipo (máx +2) |
| Diferencia de goles correcta | +1 por gol de diferencia |
| Diferencia de goles incorrecta | -1 por gol de diferencia |
| Victoria por penales correcta | ×2 al total del partido |
| Derrota por penales | equivale a empate |

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

- Cualquier usuario autenticado puede crear torneos
- El creador es automáticamente admin + jugador aprobado
- Límite default: 10 jugadores por torneo, 4 torneos por usuario
- Un jugador puede participar en múltiples torneos simultáneamente
- Los torneos son públicos (nombre, modo, creador, cantidad de jugadores)
- El admin aprueba o rechaza solicitudes de unión

### Roles
| Rol | Permisos |
|-----|----------|
| admin | Invitar, aprobar/rechazar, eliminar jugadores, editar config, ver todo |
| player | Cargar pronósticos, ver leaderboard, ver pronósticos desbloqueados |
| pending | Solo ve info pública del torneo |

---

## Schema de base de datos

### Tablas
```
public.users               — perfil público (espejo de auth.users)
public.competitions        — Mundial, Champions, etc.
public.teams               — equipos por competición
public.matches             — partidos con resultados reales
public.tournaments         — torneos creados por usuarios
public.tournament_config   — multiplicadores y puntos editables por torneo
public.tournament_players  — relación users ↔ tournaments (con rol y estado)
public.posiciones_predictions — pronósticos Modo Posiciones (1 fila por equipo/usuario/torneo)
public.match_predictions      — pronósticos Modo Partidos (1 fila por partido/usuario/torneo)
public.scores              — leaderboard materializado
public.plan_upgrades       — historial de pagos/upgrades (MercadoPago, no activo aún)
```

### Campos clave

**competitions**
- `type`: `'world_cup' | 'champions_league' | 'other'`
- `available_modes`: `text[]` — ej. `['posiciones','partidos']` o `['partidos']`
- `status`: `'upcoming' | 'active' | 'finished'`

**matches**
- `stage`: `'group' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'`
- `winner`: `'home' | 'away' | 'draw'`
- `went_to_pens`: boolean
- `pen_winner`: `'home' | 'away'`

**posiciones_predictions**
- `group_position`: 1-4
- `world_position`: `null | 'fourth' | 'third' | 'runner_up' | 'champion'`

**tournament_players**
- `role`: `'admin' | 'player'`
- `status`: `'pending' | 'approved' | 'rejected'`

### Scores materializados
La tabla `scores` se recalcula con triggers/Edge Functions cada vez que entra un resultado en `matches`. No se calcula on-the-fly. Habilitado para Supabase Realtime.

### Función helper en DB
```sql
public.get_posiciones_multiplier(tournament_id, user_id, team_id) → int
```
Devuelve el multiplicador activo para un equipo: world_position tiene prioridad sobre group_position.

---

## Triggers automáticos
- `on_auth_user_created` → crea registro en `public.users` al registrarse
- `on_tournament_created` → inserta al creador como admin aprobado + crea `tournament_config` con defaults + incrementa `tournaments_created`

---

## RLS (Row Level Security)
Activo en todas las tablas. Políticas clave:

- **posiciones_predictions:** visibles para todos solo cuando `tournaments.locked_at <= now()`. Editables solo si el torneo no está bloqueado.
- **match_predictions:** visibles para todos solo cuando `matches.kickoff_at <= now()`. Editables solo hasta 1 hora antes del kickoff.
- **scores:** visibles solo para jugadores aprobados del torneo.
- **tournament_config:** legible por participantes aprobados, editable solo por admin.

---

## Monetización futura (no activo)
- Límite: 10 jugadores/torneo, 4 torneos/usuario
- Upgrades: +10 jugadores por torneo ($10.000 ARS), +1 torneo ($10.000 ARS)
- Tabla `plan_upgrades` lista para integrar MercadoPago Checkout
- Campos `max_players` (en tournaments) y `max_tournaments` (en users) ya en DB

---

## APIs externas (pendiente de integrar)
Para resultados automáticos de partidos. Opciones a evaluar:
- API-Football (api-football.com)
- football-data.org

Cada entidad tiene campo `external_id` para mapear sin depender de IDs internos.

---

Repo GitHub: https://github.com/juanpfox/prode

## Pendientes / próximos pasos
- [X] Crear repo GitHub (`prode-mundial`, privado)
- [X] `npm create vite@latest prode-mundial -- --template react`
- [X] Instalar dependencias: `@supabase/supabase-js`, `react-i18next`, `@tanstack/react-query`, `vite-plugin-pwa`, `react-router-dom`, `i18next-browser-languagedetector`
- [X] Configurar Auth (magic link + Google OAuth habilitado)
- [X] UI Base y navegación (Home, Torneos, Predicciones, Ranking, Perfil)
- [X] Favicon de fútbol
- [X] Deploy inicial en Cloudflare Pages conectado al repo de GitHub
- [ ] Elegir e integrar API de resultados (API-Football vs footbal-data.org)
- [ ] Crear bot/ping para evitar pausa de Supabase Free
- [ ] Habilitar Supabase Realtime en tabla `scores`
- [ ] Implementar lógica de cálculo de puntos en Edge Functions / Triggers

