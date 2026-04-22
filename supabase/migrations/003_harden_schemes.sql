-- Hardening pass on top of 002.
--
-- Goals:
--   1. Move vote counters from a client-callable SECURITY DEFINER RPC to an
--      internal trigger. RLS on scheme_votes already pins writes to the
--      caller, so counters derived from COUNT(scheme_votes) are inherently
--      unforgeable — no RPC surface to spam.
--   2. Rate limit comments: 5 seconds between posts from the same user.
--   3. Domain CHECK constraints to prevent garbage data.
--
-- NOTE: this doesn't fix the client-trust auth model (see SECURITY.md).
-- It just removes the one easily-exploitable counter-spam path my previous
-- migration introduced, and tightens what legitimate clients can store.


-- ========== 1) vote counter trigger (replaces apply_scheme_vote RPC) ==========

DROP FUNCTION IF EXISTS apply_scheme_vote(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION recount_scheme_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_recount_scheme_votes ON scheme_votes;
CREATE TRIGGER trg_recount_scheme_votes
AFTER INSERT OR UPDATE OR DELETE ON scheme_votes
FOR EACH ROW EXECUTE FUNCTION recount_scheme_votes();


-- ========== 2) rate limit on scheme_comments ==========
-- 5-second minimum gap between posts from the same user. Cheap to check,
-- stops naive spammers. Not a substitute for real abuse prevention.

CREATE OR REPLACE FUNCTION enforce_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  last_post TIMESTAMPTZ;
BEGIN
  SELECT MAX(created_at) INTO last_post
    FROM scheme_comments
   WHERE user_id = NEW.user_id;

  IF last_post IS NOT NULL AND NOW() - last_post < INTERVAL '5 seconds' THEN
    RAISE EXCEPTION 'rate_limit: wait % ms before next comment',
      EXTRACT(EPOCH FROM (INTERVAL '5 seconds' - (NOW() - last_post))) * 1000
      USING ERRCODE = '55P03'; -- lock_not_available, maps to 409-ish semantics
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_rate_limit ON scheme_comments;
CREATE TRIGGER trg_comment_rate_limit
BEFORE INSERT ON scheme_comments
FOR EACH ROW EXECUTE FUNCTION enforce_comment_rate_limit();


-- ========== 3) CHECK constraints on schemes ==========
-- Country codes: 2 uppercase letters (ISO alpha-2). We hold a whitelist
-- in the frontend (`COUNTRY_CODES` in visaRules.ts) but a DB-level
-- guard stops rogue writes and typos.

ALTER TABLE schemes
  DROP CONSTRAINT IF EXISTS schemes_passport_valid,
  DROP CONSTRAINT IF EXISTS schemes_from_country_format,
  DROP CONSTRAINT IF EXISTS schemes_to_country_format,
  DROP CONSTRAINT IF EXISTS schemes_cost_nonneg,
  DROP CONSTRAINT IF EXISTS schemes_duration_nonneg,
  DROP CONSTRAINT IF EXISTS schemes_description_len,
  DROP CONSTRAINT IF EXISTS schemes_tip_len,
  DROP CONSTRAINT IF EXISTS schemes_border_crossing_len;

ALTER TABLE schemes
  ADD CONSTRAINT schemes_passport_valid CHECK (passport IN ('RU','UA','KZ')),
  ADD CONSTRAINT schemes_from_country_format CHECK (from_country ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT schemes_to_country_format CHECK (to_country ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT schemes_cost_nonneg CHECK (cost_usd IS NULL OR cost_usd >= 0),
  ADD CONSTRAINT schemes_duration_nonneg CHECK (duration_hours IS NULL OR duration_hours >= 0),
  ADD CONSTRAINT schemes_description_len CHECK (char_length(description) BETWEEN 1 AND 2000),
  ADD CONSTRAINT schemes_tip_len CHECK (tip IS NULL OR char_length(tip) <= 500),
  ADD CONSTRAINT schemes_border_crossing_len CHECK (border_crossing IS NULL OR char_length(border_crossing) <= 120);


-- ========== 4) CHECK on users.passport_country (001 already has one, double-check) ==========
-- No-op if 001 already created it. Nothing to change.
