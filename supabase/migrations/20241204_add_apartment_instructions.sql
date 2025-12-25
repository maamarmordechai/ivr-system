-- Add instructions field to apartments table
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS instructions TEXT;

COMMENT ON COLUMN apartments.instructions IS 'Special instructions for guests (e.g., entrance location, lock combination, parking info)';
