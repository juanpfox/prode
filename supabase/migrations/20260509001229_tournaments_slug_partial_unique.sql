-- Replace the unconditional UNIQUE constraint on tournaments.slug with a
-- partial unique index that ignores soft-deleted rows. This lets a slug be
-- reused after the tournament holding it is abandoned by all members
-- (which sets deleted_at via leave_tournament).

ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_slug_key;

CREATE UNIQUE INDEX tournaments_slug_key
  ON public.tournaments (slug)
  WHERE deleted_at IS NULL;
