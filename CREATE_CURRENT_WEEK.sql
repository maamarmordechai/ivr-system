-- Create current week for open call system
-- Run this in Supabase SQL Editor after running SETUP_OPEN_CALL_SYSTEM.sql

-- First, ensure we have a current week in desperate_weeks
DO $$
DECLARE
  v_current_week_id UUID;
  v_week_start DATE;
  v_week_end DATE;
  v_days_until_friday INTEGER;
BEGIN
  -- Calculate this week's Friday (start of Shabbat week)
  -- Sunday = 0, Monday = 1, ..., Friday = 5, Saturday = 6
  v_days_until_friday := (5 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 7) % 7;
  IF v_days_until_friday = 0 AND EXTRACT(DOW FROM CURRENT_DATE) > 5 THEN
    -- If today is Saturday (6), get next Friday
    v_days_until_friday := 6;
  END IF;
  v_week_start := CURRENT_DATE + v_days_until_friday;
  v_week_end := v_week_start + 1; -- Saturday is the day after Friday
  
  -- Check if this week already exists
  SELECT id INTO v_current_week_id
  FROM desperate_weeks
  WHERE week_start_date = v_week_start;
  
  -- If not exists, create it
  IF v_current_week_id IS NULL THEN
    INSERT INTO desperate_weeks (week_start_date, week_end_date, is_desperate)
    VALUES (v_week_start, v_week_end, true)
    RETURNING id INTO v_current_week_id;
    
    RAISE NOTICE 'Created new week with ID: % for dates: % to %', v_current_week_id, v_week_start, v_week_end;
  ELSE
    RAISE NOTICE 'Week already exists with ID: % for dates: % to %', v_current_week_id, v_week_start, v_week_end;
  END IF;
  
  -- Create weekly_bed_tracking entry for this week
  INSERT INTO weekly_bed_tracking (week_id, beds_needed, beds_confirmed)
  VALUES (v_current_week_id, 30, 0)
  ON CONFLICT (week_id) DO NOTHING;
  
  RAISE NOTICE 'Weekly bed tracking entry created/verified';
END $$;

-- Verify the setup
SELECT 
  dw.id as week_id,
  dw.week_start_date,
  dw.week_end_date,
  dw.is_desperate,
  wbt.beds_needed,
  wbt.beds_confirmed,
  wbt.meals_needed,
  wbt.friday_night_meals_confirmed,
  wbt.saturday_day_meals_confirmed
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
WHERE dw.week_end_date >= CURRENT_DATE - 7
ORDER BY dw.week_end_date DESC;
