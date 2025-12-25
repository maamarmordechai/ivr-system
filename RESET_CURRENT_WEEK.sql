-- RESET WEEK AND CREATE NEW WEEK
-- Run this in Supabase SQL Editor

-- Step 1: See current weeks
SELECT 
  id, 
  week_start_date, 
  week_end_date, 
  is_desperate,
  expected_guests
FROM desperate_weeks 
ORDER BY week_start_date DESC
LIMIT 5;

-- Step 2: See current bed tracking
SELECT 
  wbt.*,
  dw.week_start_date,
  dw.week_end_date
FROM weekly_bed_tracking wbt
JOIN desperate_weeks dw ON dw.id = wbt.week_id
ORDER BY dw.week_start_date DESC
LIMIT 5;

-- Step 3: Create a fresh week for the current week (December 15-21, 2024)
-- This will auto-create if the handle-weekly-availability function runs,
-- but you can also manually create:

-- Delete old weeks if needed (be careful!)
-- DELETE FROM weekly_bed_tracking WHERE week_id IN (SELECT id FROM desperate_weeks WHERE week_end_date < CURRENT_DATE - INTERVAL '7 days');
-- DELETE FROM desperate_weeks WHERE week_end_date < CURRENT_DATE - INTERVAL '7 days';

-- Find the current week's Sunday and Saturday
DO $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_sunday DATE;
  v_saturday DATE;
  v_existing_week_id UUID;
  v_new_week_id UUID;
BEGIN
  -- Calculate this week's Sunday
  v_sunday := v_today - EXTRACT(DOW FROM v_today)::INTEGER;
  v_saturday := v_sunday + 6;
  
  RAISE NOTICE 'Current week: % to %', v_sunday, v_saturday;
  
  -- Check if week already exists
  SELECT id INTO v_existing_week_id
  FROM desperate_weeks
  WHERE week_start_date = v_sunday AND week_end_date = v_saturday;
  
  IF v_existing_week_id IS NOT NULL THEN
    RAISE NOTICE 'Week already exists with ID: %', v_existing_week_id;
    
    -- Check if tracking exists
    IF EXISTS (SELECT 1 FROM weekly_bed_tracking WHERE week_id = v_existing_week_id) THEN
      RAISE NOTICE 'Bed tracking exists for this week.';
    ELSE
      -- Create bed tracking for existing week
      INSERT INTO weekly_bed_tracking (week_id, beds_needed, beds_confirmed)
      VALUES (v_existing_week_id, 30, 0);
      RAISE NOTICE 'Created bed tracking with 30 beds needed, 0 confirmed.';
    END IF;
  ELSE
    -- Create new week
    INSERT INTO desperate_weeks (week_start_date, week_end_date, is_desperate, expected_guests)
    VALUES (v_sunday, v_saturday, false, 30)
    RETURNING id INTO v_new_week_id;
    
    RAISE NOTICE 'Created new week with ID: %', v_new_week_id;
    
    -- Create bed tracking for new week
    INSERT INTO weekly_bed_tracking (week_id, beds_needed, beds_confirmed)
    VALUES (v_new_week_id, 30, 0);
    RAISE NOTICE 'Created bed tracking with 30 beds needed, 0 confirmed.';
  END IF;
END $$;

-- Step 4: Verify the current week
SELECT 
  dw.id,
  dw.week_start_date,
  dw.week_end_date,
  dw.is_desperate,
  wbt.beds_needed,
  wbt.beds_confirmed,
  (wbt.beds_needed - wbt.beds_confirmed) as beds_still_needed
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
WHERE dw.week_start_date <= CURRENT_DATE AND dw.week_end_date >= CURRENT_DATE
ORDER BY dw.week_start_date DESC
LIMIT 1;
