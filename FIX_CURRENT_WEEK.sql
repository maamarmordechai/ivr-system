-- Fix: Mark the correct week as current
-- Week 6627fbb1 (Dec 21-27) should be current, not a0ed6d5c (Dec 26-29)

-- First, unmark all weeks as current
UPDATE desperate_weeks
SET is_current = false;

-- Mark the Dec 21-27 week as current (this has the 2 bed confirmations)
UPDATE desperate_weeks
SET is_current = true
WHERE id = '6627fbb1-7d50-4f3d-92ac-823a51c7b897';

-- Verify
SELECT 
  dw.id as week_id,
  dw.week_start_date,
  dw.week_end_date,
  dw.is_current,
  wbt.beds_needed,
  wbt.beds_confirmed
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
WHERE dw.week_start_date >= '2025-12-20'
ORDER BY dw.week_start_date;
