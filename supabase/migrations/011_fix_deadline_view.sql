-- Fix visa_entries_with_deadline to respect visa_end cap.
-- Before: deadline = entry_date + max_days (ignores visa_end added in 009)
-- After:  deadline = LEAST(entry_date + max_days, visa_end) when visa_end is set
CREATE OR REPLACE VIEW visa_entries_with_deadline AS
SELECT
  *,
  LEAST(
    entry_date + max_days,
    COALESCE(visa_end, entry_date + max_days)
  ) AS deadline,
  LEAST(
    entry_date + max_days,
    COALESCE(visa_end, entry_date + max_days)
  ) - CURRENT_DATE AS days_left
FROM visa_entries;
