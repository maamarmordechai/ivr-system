-- Add wants_weekly_calls field to meal_hosts table
ALTER TABLE meal_hosts
ADD COLUMN IF NOT EXISTS wants_weekly_calls BOOLEAN DEFAULT true;

COMMENT ON COLUMN meal_hosts.wants_weekly_calls IS 'Whether this host wants to receive automated weekly calls';

-- Set existing hosts to true by default
UPDATE meal_hosts SET wants_weekly_calls = true WHERE wants_weekly_calls IS NULL;
