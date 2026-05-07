# Automation Service

El servicio de automatización de resultados (Fase 1) se encarga de:
1. Ejecutar Edge Functions periódicamente (vía GitHub Actions o cron).
2. Consultar la API-Football para partidos recientes de UCL y Mundial.
3. Actualizar la tabla `matches`.
4. Disparar el recálculo automático de puntajes en la tabla `predictions`.