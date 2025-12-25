-- Check all weeks and their tracking data
SELECT 
  dw.id as week_id,
  dw.week_start_date,
  dw.week_end_date,
  dw.is_current,
  wbt.beds_needed,
  wbt.beds_confirmed,
  wbt.id as tracking_id
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
ORDER BY dw.week_start_date DESC
LIMIT 5;

-- Check recent bed confirmations
SELECT 
  bc.id,
  bc.week_id,
  bc.apartment_id,
  bc.beds_confirmed,
  bc.confirmed_at,
  apt.person_name
FROM bed_confirmations bc
LEFT JOIN apartments apt ON apt.id = bc.apartment_id
WHERE bc.voided = false
ORDER BY bc.confirmed_at DESC
LIMIT 5;
