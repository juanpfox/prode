# Arquitectura (Prode Mundial)

## Frontend
- **Framework**: React JS + Vite
- **Styling**: Vanilla CSS, variables globales, diseño glassmorphism.
- **PWA**: vite-plugin-pwa para offline y acceso nativo.
- **Estado & Fetching**: TanStack Query (React Query).
- **Routing**: React Router (con soporte para slugs de torneos).

## Backend (Supabase)
- **Auth**: Email/Password y Google OAuth.
- **Database**: PostgreSQL (tablas: users, tournaments, matches, predictions, etc).
- **Funciones**: Edge Functions para ingesta de datos de APIs externas (API-Football).