-- Fix meal_hosts table schema
-- Add missing columns that are referenced in the application

-- Add address column if not exists
ALTER TABLE meal_hosts 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add wants_weekly_calls column if not exists
ALTER TABLE meal_hosts
ADD COLUMN IF NOT EXISTS wants_weekly_calls BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN meal_hosts.address IS 'Physical address of the meal host';
COMMENT ON COLUMN meal_hosts.wants_weekly_calls IS 'Whether this host wants to receive automated weekly calls';

-- Set existing hosts to true by default for wants_weekly_calls
UPDATE meal_hosts 
SET wants_weekly_calls = true 
WHERE wants_weekly_calls IS NULL;
