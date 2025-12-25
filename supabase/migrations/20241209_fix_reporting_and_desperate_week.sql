-- Fix Reporting Issues and Add Desperate Week Checkbox
-- 1. Expected Guests should be based on guests table count (already correct)
-- 2. "Beds Needed" and "Meals Needed" should show STILL NEEDED (not total needed)
-- 3. Add "is_desperate" checkbox to mark desperate weeks
-- 4. Reset desperate week flag every Sunday

-- Add is_desperate column if it doesn't exist (it should already exist from earlier migration)
ALTER TABLE desperate_weeks 
ADD COLUMN IF NOT EXISTS is_desperate BOOLEAN DEFAULT false;

-- Add expected_guests column to desperate_weeks for easy tracking
ALTER TABLE desperate_weeks 
ADD COLUMN IF NOT EXISTS expected_guests INTEGER DEFAULT 0;

COMMENT ON COLUMN desperate_weeks.is_desperate IS 'Marks this week as desperate - triggers aggressive calling';
COMMENT ON COLUMN desperate_weeks.expected_guests IS 'Number of guests expected this week (for tracking purposes)';

-- Create function to reset desperate week flags on Sundays
CREATE OR REPLACE FUNCTION reset_desperate_week_flags()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reset is_desperate flag for all past weeks
  UPDATE desperate_weeks
  SET is_desperate = false
  WHERE week_end_date < CURRENT_DATE
  AND is_desperate = true;
  
  RAISE NOTICE 'Reset desperate flags for past weeks';
END;
$$;

COMMENT ON FUNCTION reset_desperate_week_flags() IS 'Resets is_desperate flag for past weeks. Should run via cron on Sundays.';

-- Create function to calculate beds still needed
CREATE OR REPLACE FUNCTION get_beds_still_needed(p_week_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_beds_needed INTEGER;
  v_beds_confirmed INTEGER;
BEGIN
  SELECT 
    COALESCE(wbt.beds_needed, 30) AS beds_needed,
    COALESCE(wbt.beds_confirmed, 0) AS beds_confirmed
  INTO v_beds_needed, v_beds_confirmed
  FROM weekly_bed_tracking wbt
  WHERE wbt.week_id = p_week_id;
  
  -- If no tracking record exists, return default
  IF NOT FOUND THEN
    RETURN 30;
  END IF;
  
  -- Return max(0, needed - confirmed)
  RETURN GREATEST(0, v_beds_needed - v_beds_confirmed);
END;
$$;

COMMENT ON FUNCTION get_beds_still_needed(UUID) IS 'Returns number of beds still needed (beds_needed - beds_confirmed)';

-- Create function to calculate meals still needed
CREATE OR REPLACE FUNCTION get_meals_still_needed(p_week_id UUID, p_meal_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_meals_needed INTEGER;
  v_meals_confirmed INTEGER;
BEGIN
  SELECT 
    COALESCE(wbt.meals_needed, 30) AS meals_needed,
    CASE 
      WHEN p_meal_type = 'friday' THEN COALESCE(wbt.friday_night_meals_confirmed, 0)
      WHEN p_meal_type = 'saturday' THEN COALESCE(wbt.saturday_day_meals_confirmed, 0)
      ELSE COALESCE(wbt.friday_night_meals_confirmed, 0) + COALESCE(wbt.saturday_day_meals_confirmed, 0)
    END AS meals_confirmed
  INTO v_meals_needed, v_meals_confirmed
  FROM weekly_bed_tracking wbt
  WHERE wbt.week_id = p_week_id;
  
  -- If no tracking record exists, return default
  IF NOT FOUND THEN
    RETURN 30;
  END IF;
  
  -- For 'both', compare total confirmed against needed
  IF p_meal_type = 'both' THEN
    RETURN GREATEST(0, v_meals_needed - (v_meals_confirmed / 2));
  END IF;
  
  -- Return max(0, needed - confirmed)
  RETURN GREATEST(0, v_meals_needed - v_meals_confirmed);
END;
$$;

COMMENT ON FUNCTION get_meals_still_needed(UUID, TEXT) IS 'Returns number of meals still needed. meal_type: friday, saturday, or both';

-- Create a view for easy dashboard display
CREATE OR REPLACE VIEW current_week_summary AS
SELECT 
  dw.id AS week_id,
  dw.week_start_date,
  dw.week_end_date,
  dw.parsha_name,
  dw.is_desperate,
  dw.expected_guests,
  -- Use expected_guests column instead of counting from guests table (which may not exist yet)
  dw.expected_guests AS actual_guest_count,
  COALESCE(wbt.beds_needed, 30) AS beds_needed,
  COALESCE(wbt.beds_confirmed, 0) AS beds_confirmed,
  GREATEST(0, COALESCE(wbt.beds_needed, 30) - COALESCE(wbt.beds_confirmed, 0)) AS beds_still_needed,
  COALESCE(wbt.meals_needed, 30) AS meals_needed,
  COALESCE(wbt.friday_night_meals_confirmed, 0) AS friday_confirmed,
  COALESCE(wbt.saturday_day_meals_confirmed, 0) AS saturday_confirmed,
  COALESCE(wbt.friday_night_meals_confirmed, 0) + COALESCE(wbt.saturday_day_meals_confirmed, 0) AS total_meals_confirmed,
  GREATEST(0, COALESCE(wbt.meals_needed, 30) - ((COALESCE(wbt.friday_night_meals_confirmed, 0) + COALESCE(wbt.saturday_day_meals_confirmed, 0)) / 2)) AS meals_still_needed,
  CASE 
    WHEN COALESCE(wbt.beds_needed, 30) > 0 THEN 
      ROUND((COALESCE(wbt.beds_confirmed, 0)::NUMERIC / COALESCE(wbt.beds_needed, 30)::NUMERIC) * 100, 0)
    ELSE 100
  END AS bed_confirmation_percentage,
  wbt.admin_notes
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
WHERE dw.week_end_date >= CURRENT_DATE
ORDER BY dw.week_start_date ASC
LIMIT 1;

COMMENT ON VIEW current_week_summary IS 'Shows current week with calculated still-needed values';

-- Grant permissions
GRANT SELECT ON current_week_summary TO authenticated, anon;

-- Test the functions
SELECT 
  week_id,
  week_start_date,
  week_end_date,
  is_desperate,
  actual_guest_count AS "Expected Guests",
  beds_confirmed AS "Beds Confirmed",
  beds_still_needed AS "Beds Still Needed",
  total_meals_confirmed AS "Meals Confirmed",  
  meals_still_needed AS "Meals Still Needed",
  bed_confirmation_percentage AS "Progress %"
FROM current_week_summary;
