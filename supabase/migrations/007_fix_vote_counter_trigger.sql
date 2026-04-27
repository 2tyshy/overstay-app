-- Migration 007: Fix vote counter trigger bypassing RLS
--
-- Bug: recount_scheme_votes() runs as anon caller and hits the
-- "schemes_update" RLS policy: USING (author_id IS NOT NULL).
-- Seed schemes have author_id = NULL, so their works_count/broken_count
-- silently never update when users vote on them.
--
-- Fix: add SECURITY DEFINER so the trigger runs as DB owner and
-- can UPDATE any row regardless of author_id.

CREATE OR REPLACE FUNCTION recount_scheme_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.scheme_id, OLD.scheme_id);
  UPDATE schemes
     SET works_count  = (SELECT COUNT(*) FROM scheme_votes WHERE scheme_id = target AND vote = 'works'),
         broken_count = (SELECT COUNT(*) FROM scheme_votes WHERE scheme_id = target AND vote = 'broken')
   WHERE id = target;
  RETURN NULL;
END;
$$;
