-- Migration 015: Content length constraints and feedback rate limit.
--
-- 1. Max-length CHECK constraints on chat_messages.content,
--    feedback.content, and feedback.raw_transcript.
-- 2. Rate-limit trigger on feedback: max 1 insert per 10 seconds per
--    user_id (NULL user_id is exempt — anonymous feedback is allowed freely).
--
-- All constraints are dropped before being added so this migration is
-- idempotent — safe to re-run.


-- ========== chat_messages: content length ==================================

ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_content_len;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_content_len
    CHECK (char_length(content) BETWEEN 1 AND 10000);


-- ========== feedback: content and raw_transcript length ====================

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_content_len,
  DROP CONSTRAINT IF EXISTS feedback_raw_transcript_len;

ALTER TABLE feedback
  ADD CONSTRAINT feedback_content_len
    CHECK (char_length(content) BETWEEN 1 AND 5000),
  ADD CONSTRAINT feedback_raw_transcript_len
    CHECK (raw_transcript IS NULL OR char_length(raw_transcript) <= 50000);


-- ========== feedback: rate-limit trigger ===================================
-- Mirrors the comment rate-limit pattern in migration 003:
-- raise an exception if the same user_id posted within the last 10 seconds.
-- NULL user_id (anonymous feedback) is exempted from the check.

CREATE OR REPLACE FUNCTION enforce_feedback_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  last_post TIMESTAMPTZ;
BEGIN
  -- Skip rate limiting for anonymous feedback
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT MAX(created_at) INTO last_post
    FROM feedback
   WHERE user_id = NEW.user_id;

  IF last_post IS NOT NULL AND NOW() - last_post < INTERVAL '10 seconds' THEN
    RAISE EXCEPTION 'rate_limit: wait % ms before next feedback submission',
      EXTRACT(EPOCH FROM (INTERVAL '10 seconds' - (NOW() - last_post))) * 1000
      USING ERRCODE = '55P03'; -- lock_not_available, same semantics as comment limiter
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_rate_limit ON feedback;
CREATE TRIGGER trg_feedback_rate_limit
BEFORE INSERT ON feedback
FOR EACH ROW EXECUTE FUNCTION enforce_feedback_rate_limit();
