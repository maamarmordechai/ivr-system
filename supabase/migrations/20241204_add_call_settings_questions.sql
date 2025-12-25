-- Add new question columns to call_settings table
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS crib_question TEXT DEFAULT 'Some guests have babies. Do you have a crib available? Press 1 for yes, or 2 for no.';

ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS two_couples_question TEXT DEFAULT 'You have multiple bedrooms and can accommodate 2 couples in separate rooms. Would you be comfortable hosting 2 couples? Press 1 for yes, or 2 for no.';

-- Add comments for documentation
COMMENT ON COLUMN call_settings.crib_question IS 'Question asked when guests with babies are pending and apartment crib status is unknown';
COMMENT ON COLUMN call_settings.two_couples_question IS 'Question asked when apartment can fit 2+ couples and multiple couples are waiting';
