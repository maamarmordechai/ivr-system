-- Add mix_question column to call_settings table
ALTER TABLE call_settings
ADD COLUMN IF NOT EXISTS mix_question TEXT NOT NULL DEFAULT 'You have multiple rooms. Can we place a couple in one room and individuals in other rooms? Press 1 for yes, or 2 for no.';

-- Update existing record if it exists
UPDATE call_settings 
SET mix_question = 'You have multiple rooms. Can we place a couple in one room and individuals in other rooms? Press 1 for yes, or 2 for no.'
WHERE mix_question IS NULL;
