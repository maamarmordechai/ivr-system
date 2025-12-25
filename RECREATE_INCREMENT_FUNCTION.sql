-- Drop and recreate increment_beds_confirmed function with updated parameter name

DROP FUNCTION IF EXISTS increment_beds_confirmed(UUID, INTEGER);

CREATE OR REPLACE FUNCTION increment_beds_confirmed(
  p_week_id UUID,
  p_beds INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update beds_confirmed in weekly_bed_tracking
  UPDATE weekly_bed_tracking
  SET 
    beds_confirmed = COALESCE(beds_confirmed, 0) + p_beds,
    updated_at = NOW()
  WHERE week_id = p_week_id;
  
  -- If no row exists, create one
  IF NOT FOUND THEN
    INSERT INTO weekly_bed_tracking (week_id, beds_confirmed, beds_needed)
    VALUES (p_week_id, p_beds, 2)
    ON CONFLICT (week_id) DO UPDATE
    SET beds_confirmed = weekly_bed_tracking.beds_confirmed + p_beds;
  END IF;
END;
$$;

-- Test it
SELECT 
  week_id,
  beds_needed,
  beds_confirmed
FROM weekly_bed_tracking
ORDER BY created_at DESC
LIMIT 3;
