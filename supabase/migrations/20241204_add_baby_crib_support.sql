-- Add has_baby column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS has_baby BOOLEAN DEFAULT false;

-- Add has_crib column to apartments table
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS has_crib BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN guests.has_baby IS 'Indicates if the guest has a baby requiring a crib';
COMMENT ON COLUMN apartments.has_crib IS 'Indicates if the apartment has a crib available for babies';
