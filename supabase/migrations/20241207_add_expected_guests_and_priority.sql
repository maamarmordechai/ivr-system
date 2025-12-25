-- Add expected_guests to track weekly requirements (auto-calculated from guests table)
ALTER TABLE weekly_bed_needs 
ADD COLUMN IF NOT EXISTS expected_guests INTEGER DEFAULT 0;

COMMENT ON COLUMN weekly_bed_needs.expected_guests IS 'Auto-calculated: Number of guests with arrival_date this week';

-- Function to calculate expected guests for a week
CREATE OR REPLACE FUNCTION calculate_expected_guests(week_start DATE)
RETURNS INTEGER AS $$
DECLARE
  guest_count INTEGER;
BEGIN
  -- Count guests arriving this Saturday
  SELECT COUNT(*)
  INTO guest_count
  FROM guests
  WHERE arrival_date = week_start + INTERVAL '1 day'; -- Saturday is Friday + 1 day
  
  RETURN COALESCE(guest_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Update expected_guests whenever a guest is added/updated/deleted
CREATE OR REPLACE FUNCTION update_expected_guests()
RETURNS TRIGGER AS $$
DECLARE
  week_id_to_update UUID;
  week_start_date DATE;
BEGIN
  -- Get the week_id for the guest's arrival date
  IF TG_OP = 'DELETE' THEN
    week_start_date := (SELECT week_start_date FROM weekly_bed_needs 
                        WHERE week_start_date = DATE_TRUNC('week', OLD.arrival_date)::DATE 
                        LIMIT 1);
  ELSE
    week_start_date := (SELECT week_start_date FROM weekly_bed_needs 
                        WHERE week_start_date = DATE_TRUNC('week', NEW.arrival_date)::DATE 
                        LIMIT 1);
  END IF;

  IF week_start_date IS NOT NULL THEN
    -- Update expected_guests count
    UPDATE weekly_bed_needs
    SET expected_guests = calculate_expected_guests(week_start_date)
    WHERE weekly_bed_needs.week_start_date = week_start_date;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on guests table
DROP TRIGGER IF EXISTS trigger_update_expected_guests ON guests;
CREATE TRIGGER trigger_update_expected_guests
AFTER INSERT OR UPDATE OR DELETE ON guests
FOR EACH ROW
EXECUTE FUNCTION update_expected_guests();

-- Add priority tracking to bed_availability_responses
ALTER TABLE bed_availability_responses
ADD COLUMN IF NOT EXISTS last_positive_response_week DATE,
ADD COLUMN IF NOT EXISTS total_positive_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 0;

COMMENT ON COLUMN bed_availability_responses.last_positive_response_week IS 'Week start date of last time they said yes';
COMMENT ON COLUMN bed_availability_responses.total_positive_responses IS 'How many times they have said yes historically';
COMMENT ON COLUMN bed_availability_responses.priority_level IS 'Lower = higher priority. 0 = never responded positively, increases with each yes';

-- Update trigger function to also calculate priority
CREATE OR REPLACE FUNCTION update_week_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the week_id from the trigger
  DECLARE
    v_week_id UUID;
    v_total_available INTEGER;
    v_total_assigned INTEGER;
    v_beds_needed INTEGER;
    v_new_status TEXT;
  BEGIN
    -- Determine which week_id to update
    IF TG_TABLE_NAME = 'bed_availability_responses' THEN
      v_week_id := COALESCE(NEW.week_id, OLD.week_id);
    ELSIF TG_TABLE_NAME = 'bed_assignments' THEN
      v_week_id := COALESCE(NEW.week_id, OLD.week_id);
    END IF;

    -- Calculate total available beds
    SELECT COALESCE(SUM(beds_offered), 0)
    INTO v_total_available
    FROM bed_availability_responses
    WHERE week_id = v_week_id
      AND response_type IN ('yes', 'partial');

    -- Calculate total assigned beds
    SELECT COALESCE(SUM(beds_needed), 0)
    INTO v_total_assigned
    FROM bed_assignments
    WHERE week_id = v_week_id
      AND status = 'active';

    -- Get beds needed
    SELECT beds_needed INTO v_beds_needed
    FROM weekly_bed_needs
    WHERE id = v_week_id;

    -- Determine status
    IF v_total_available >= v_beds_needed THEN
      v_new_status := 'sufficient';
    ELSIF v_total_available > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'insufficient';
    END IF;

    -- Update the weekly_bed_needs table
    UPDATE weekly_bed_needs
    SET 
      beds_available = v_total_available,
      beds_assigned = v_total_assigned,
      status = v_new_status
    WHERE id = v_week_id;

    -- Update priority for positive responses
    IF TG_TABLE_NAME = 'bed_availability_responses' AND NEW.response_type IN ('yes', 'partial') THEN
      UPDATE bed_availability_responses
      SET 
        last_positive_response_week = (SELECT week_start_date FROM weekly_bed_needs WHERE id = NEW.week_id),
        total_positive_responses = total_positive_responses + 1,
        priority_level = total_positive_responses + 1
      WHERE id = NEW.id;
    END IF;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create index for priority queries
CREATE INDEX IF NOT EXISTS idx_priority_level ON bed_availability_responses(priority_level, last_positive_response_week);
