-- Migration 016: Add last_voted_at to schemes
--
-- Tracks when the most recent vote was cast on each scheme.
-- Used in UI to show how fresh the community verification is.

ALTER TABLE schemes ADD COLUMN IF NOT EXISTS last_voted_at TIMESTAMPTZ;

-- Backfill from existing votes
UPDATE schemes s
   SET last_voted_at = (
     SELECT MAX(created_at) FROM scheme_votes WHERE scheme_id = s.id
   );

-- Keep last_voted_at in sync with the vote counter trigger
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
     SET works_count   = (SELECT COUNT(*) FROM scheme_votes WHERE scheme_id = target AND vote = 'works'),
         broken_count  = (SELECT COUNT(*) FROM scheme_votes WHERE scheme_id = target AND vote = 'broken'),
         last_voted_at = (SELECT MAX(created_at) FROM scheme_votes WHERE scheme_id = target)
   WHERE id = target;
  RETURN NULL;
END;
$$;
