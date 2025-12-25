-- Update guests table to use week_id instead of check-in/out dates
-- Remove is_couple (auto-calculated from guest_type)

-- Add week_id column if it doesn't exist
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES weekly_bed_needs(id);

-- Add group_size column if it doesn't exist (replaces number_of_people)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS group_size INTEGER;

-- Migrate data from number_of_people to group_size if number_of_people exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guests' AND column_name = 'number_of_people'
  ) THEN
    UPDATE guests SET group_size = number_of_people WHERE group_size IS NULL;
    ALTER TABLE guests DROP COLUMN number_of_people;
  END IF;
END $$;

-- Drop old check-in/out date columns if they exist
ALTER TABLE guests
DROP COLUMN IF EXISTS check_in_date,
DROP COLUMN IF EXISTS check_out_date,
DROP COLUMN IF EXISTS arrival_date;

-- is_couple will now be auto-set based on guest_type='family'
COMMENT ON COLUMN guests.is_couple IS 'Auto-set: true if guest_type=family';
COMMENT ON COLUMN guests.week_id IS 'Which Shabbos week the guest is coming for';

-- Update expected_guests calculation to use week_id instead of arrival_date
CREATE OR REPLACE FUNCTION calculate_expected_guests_by_week(target_week_id UUID)
RETURNS INTEGER AS $$
DECLARE
  guest_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO guest_count
  FROM guests
  WHERE week_id = target_week_id;
  
  RETURN COALESCE(guest_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Update trigger for expected guests
CREATE OR REPLACE FUNCTION update_expected_guests()
RETURNS TRIGGER AS $$
DECLARE
  target_week_id UUID;
BEGIN
  -- Get the week_id from the guest record
  IF TG_OP = 'DELETE' THEN
    target_week_id := OLD.week_id;
  ELSE
    target_week_id := NEW.week_id;
  END IF;

  IF target_week_id IS NOT NULL THEN
    -- Update expected_guests count
    UPDATE weekly_bed_needs
    SET expected_guests = calculate_expected_guests_by_week(target_week_id)
    WHERE id = target_week_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_expected_guests ON guests;
CREATE TRIGGER trigger_update_expected_guests
AFTER INSERT OR UPDATE OR DELETE ON guests
FOR EACH ROW
EXECUTE FUNCTION update_expected_guests();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_guests_week_id ON guests(week_id);
