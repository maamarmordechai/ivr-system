-- Update beds_needed for the current week
UPDATE weekly_bed_tracking
SET beds_needed = 2
WHERE week_id = '6627fbb1-7d50-4f3d-92ac-823a51c7b897';

-- Verify
SELECT 
  week_id,
  beds_needed,
  beds_confirmed
FROM weekly_bed_tracking
WHERE week_id = '6627fbb1-7d50-4f3d-92ac-823a51c7b897';
