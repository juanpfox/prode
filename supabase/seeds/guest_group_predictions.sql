-- =============================================================
-- Seed: Pronósticos del usuario guest para la etapa de grupos
--       en el torneo "Torneo Guest"
--
-- Uso: ejecutar en el SQL Editor de Supabase
-- =============================================================

DO $$
DECLARE
  v_guest_id     UUID;
  v_tournament_id UUID;
  v_competition_id UUID;
  v_count         INT;
BEGIN

  -- 1. Obtener el UUID del usuario guest
  SELECT id INTO v_guest_id
  FROM auth.users
  WHERE email = 'guest@prodemundial.dev'
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    RAISE EXCEPTION 'Usuario guest no encontrado (guest@prodemundial.dev)';
  END IF;

  -- 2. Obtener el torneo "Torneo Guest" y su competición
  SELECT id, competition_id INTO v_tournament_id, v_competition_id
  FROM public.tournaments
  WHERE name = 'Torneo Guest'
  LIMIT 1;

  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Torneo "Torneo Guest" no encontrado';
  END IF;

  -- 3. Insertar un pronóstico por cada partido de fase de grupos
  --    Usa ON CONFLICT para actualizar si ya existe un pronóstico previo
  INSERT INTO public.match_predictions (tournament_id, user_id, match_id, home_goals, away_goals)
  SELECT
    v_tournament_id,
    v_guest_id,
    m.id,
    floor(random() * 4)::int,   -- goles local: 0 a 3
    floor(random() * 3)::int    -- goles visitante: 0 a 2
  FROM public.matches m
  WHERE m.competition_id = v_competition_id
    AND m.stage = 'group'
  ON CONFLICT (tournament_id, user_id, match_id)
  DO UPDATE SET
    home_goals = EXCLUDED.home_goals,
    away_goals = EXCLUDED.away_goals,
    pen_pick   = NULL;

  -- 4. Reportar cuántos pronósticos se procesaron
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Pronósticos cargados/actualizados: %', v_count;

END $$;
