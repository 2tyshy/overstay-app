-- Migration 005: CHECK constraints on visa_entries + RLS on visa_rules
--
-- Goals:
--   1. Add input validation to visa_entries (country format, field lengths)
--      to prevent garbage data and close the HTML-injection vector in bot
--      messages (bot/messages.ts escapes at render time, but DB-level
--      constraints are a second line of defence).
--   2. Enable RLS on visa_rules and allow only SELECT via anon.
--      Without this, any anon caller can INSERT/UPDATE/DELETE reference data,
--      corrupting deadline calculations for all users.


-- ========== 1) visa_entries constraints ==========

ALTER TABLE visa_entries
  ADD CONSTRAINT visa_entries_country_format
    CHECK (country ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT visa_entries_visa_type_length
    CHECK (char_length(visa_type) <= 100),
  ADD CONSTRAINT visa_entries_notes_length
    CHECK (notes IS NULL OR char_length(notes) <= 2000);


-- ========== 2) visa_rules RLS ==========

ALTER TABLE visa_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can read visa rules (they are public reference data).
CREATE POLICY "visa_rules_select"
  ON visa_rules
  FOR SELECT
  USING (true);

-- Mutations only via service_role (no policy = anon/authenticated blocked).
