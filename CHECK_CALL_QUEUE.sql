-- Check the current call queue status
SELECT 
  cq.*,
  a.person_name,
  a.phone_number as apt_phone
FROM call_queue cq
LEFT JOIN apartments a ON a.id = cq.apartment_id
ORDER BY cq.created_at DESC
LIMIT 10;

-- Check recent bed tracking
SELECT * FROM weekly_bed_tracking 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent availability calls
SELECT * FROM weekly_availability_calls
ORDER BY created_at DESC
LIMIT 10;
