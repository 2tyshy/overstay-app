-- Fix visa_entries_with_deadline to respect visa_end cap.
-- DROP + recreate required because SELECT * now includes visa_start/visa_end
-- (added in 009), so column ordering changed and CREATE OR REPLACE fails.
DROP VIEW IF EXISTS visa_entries_with_deadline;
CREATE VIEW visa_entries_with_deadline AS
SELECT
  id, user_id, country, entry_date, visa_type, max_days, notes, created_at,
  visa_start, visa_end,
  LEAST(
    entry_date + max_days,
    COALESCE(visa_end, entry_date + max_days)
  ) AS deadline,
  LEAST(
    entry_date + max_days,
    COALESCE(visa_end, entry_date + max_days)
  ) - CURRENT_DATE AS days_left
FROM visa_entries;
