-- Add address column to meal_hosts table
-- This allows tracking meal host addresses for better coordination

ALTER TABLE meal_hosts 
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN meal_hosts.address IS 'Physical address of the meal host';

-- Update any existing meal hosts to have a placeholder
-- (Optional - you can remove this if you want addresses to be NULL initially)
-- UPDATE meal_hosts SET address = 'Address not provided' WHERE address IS NULL;
