-- View who accepted beds for the current week
-- Run this in Supabase SQL Editor to see all hosts who confirmed beds

SELECT 
  a.person_name,
  a.phone_number,
  a.number_of_beds,
  a.last_helped_date,
  a.times_helped,
  wbt.beds_confirmed as total_beds_confirmed,
  wbt.beds_needed,
  (wbt.beds_needed - wbt.beds_confirmed) as beds_remaining
FROM apartments a
CROSS JOIN (
  SELECT wbt.* 
  FROM weekly_bed_tracking wbt
  JOIN desperate_weeks dw ON dw.id = wbt.week_id
  WHERE dw.week_end_date >= CURRENT_DATE
  ORDER BY dw.week_start_date
  LIMIT 1
) wbt
WHERE a.last_helped_date >= CURRENT_DATE - 7
ORDER BY a.last_helped_date DESC;
