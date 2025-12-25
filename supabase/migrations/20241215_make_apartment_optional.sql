-- Make apartment_id explicitly nullable for Excel batch calls
-- Add index on caller_phone for better query performance

-- apartment_id is already nullable, but let's add a comment to make it clear
COMMENT ON COLUMN weekly_availability_calls.apartment_id IS 'Optional - NULL for calls from Excel batch (non-registered hosts)';

-- Add index on caller_phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_availability_phone ON weekly_availability_calls(caller_phone);

COMMENT ON INDEX idx_weekly_availability_phone IS 'Index for looking up responses by phone number';
