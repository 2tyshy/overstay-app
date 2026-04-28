-- Add visa validity window columns to visa_entries.
-- visa_start: date visa was issued (optional, for display)
-- visa_end: date visa expires (optional, caps effective stay if earlier than entry + max_days)
ALTER TABLE visa_entries
  ADD COLUMN IF NOT EXISTS visa_start DATE,
  ADD COLUMN IF NOT EXISTS visa_end DATE;
