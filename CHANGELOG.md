# Changelog / Historial de Tareas Completadas

Este archivo mantiene el registro histórico de todas las tareas, features y correcciones de bugs que ya han sido implementadas en el proyecto. Esto permite mantener el archivo `tasks.md` limpio, enfocado y escalable.

## Fase 1: Automatización de Resultados (API y Backend)
- **Implementar lógica de puntos automática en Supabase / Backend**
  - Configurar un webhook o proceso periódico (Activo vía GitHub Actions para UCL).
  - Diseñar y programar triggers para recálculo automático (`recalculate_all_scores_for_competition`).
  - Lógica de cálculo para torneos modo "Posiciones" y acople al botón "Recalcular pts".

## Fase 2: Mantenimiento e Infraestructura
- **Resolución de bugs y mantenimientos menores**
  - Mostrar todas las fases de playoffs simultáneamente en vista desktop.
  - Expandir el ancho del contenedor en escritorio (1600px) para la vista de PlayOffs.
  - Eliminar botón "Entrar como invitado".
  - Bug Fix: Tournament Creation Scoring Buttons.
  - Bug Fix: Rules Tab Example.
  - Simplificar creación de torneos: Solo World Cup.
  - Mejora de Ranking: Mostrar participantes con 0 puntos.
  - Renombrar "Ranking" a "Posiciones".
  - Vista Grupos: Agregar tabla de Posiciones Real.
  - Vista Grupos: Página de Mejores Terceros.
  - Limpiar fichas de torneos.
  - Bug Fix: Cloudflare Deployment Failure (PWA Assets Limit).
  - Bug Fix: Tournament Config Page empty.
  - Bug Fix: Equipos reales en bracket de playoffs.
  - Tooltip de cálculo de puntos en pronósticos.
  - Ajustes en pantalla de creación de torneo.
  - Pestaña "Unirme a otro torneo".
  - Mostrar etiqueta (admin) en tabla de posiciones.
  - Bug Fix: Banderas y nombres corregidos (Irak, RD Congo, etc.).

## Fase 4: Experiencia de Usuario y Destacados
- **Torneos Destacados (Featured Tournaments)**: Columna `is_featured`, visualización de estrellas.
- **Home Page**: Mejor onboarding, ocultar secciones vacías.
- **Usuarios de prueba**: Rutas `/guest` y `/guest2` para login automático.
- **Sub-URLs personalizadas (Slugs)**: Para acceder a torneos vía URL única `/:slug`. Eliminación de códigos de invitación.
- **Sincronización de predicciones**: Copiar predicciones entre torneos, autoguardado en hermanos.
- **Página de inicio**: Torneos es ahora la ruta predeterminada `/` con redirecciones correctas.

## Fase 5: Perfil y Personalización
- **Sistema de Avatares Personalizados**: Catálogo de imágenes (famosos, clubes, animales), componentes en página propia y autoguardado.
- **Avatares para Torneos**: Uso de categorías permitidas y fallback.
- **Penalización por empate fallido en goles**: Descuento paramétrico en `tournament_config` (`pts_descuento_empate`).
- **Countdown al Mundial 2026**: Componente glassmorphism en Login y versión compacta en Top bar.
- **Avatar por defecto para usuarios**: Uso de emoji 👤 como fallback.
- **Rediseño Login**: Layout desktop (2 columnas).
- **Redirección post-login**: Volver a la URL de origen tras iniciar sesión.
