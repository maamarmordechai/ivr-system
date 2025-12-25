-- QUICK RESET: Set beds_confirmed to 0 for current week
-- Run this in Supabase SQL Editor

-- Reset beds_confirmed to 0 for the current week
UPDATE weekly_bed_tracking
SET beds_confirmed = 0
WHERE week_id IN (
  SELECT id FROM desperate_weeks 
  WHERE week_start_date <= CURRENT_DATE 
  AND week_end_date >= CURRENT_DATE
);

-- Also clear any bed confirmations for this week
DELETE FROM bed_confirmations
WHERE week_id IN (
  SELECT id FROM desperate_weeks 
  WHERE week_start_date <= CURRENT_DATE 
  AND week_end_date >= CURRENT_DATE
);

-- Clear weekly availability calls for this week (optional - comment out if you want to keep history)
-- DELETE FROM weekly_availability_calls
-- WHERE week_id IN (
--   SELECT id FROM desperate_weeks 
--   WHERE week_start_date <= CURRENT_DATE 
--   AND week_end_date >= CURRENT_DATE
-- );

-- Verify
SELECT 
  dw.id,
  dw.week_start_date,
  dw.week_end_date,
  wbt.beds_needed,
  wbt.beds_confirmed,
  (SELECT COUNT(*) FROM bed_confirmations bc WHERE bc.week_id = dw.id) as confirmation_count
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
WHERE dw.week_start_date <= CURRENT_DATE AND dw.week_end_date >= CURRENT_DATE;
