-- Check if there's a call queue
SELECT * FROM call_queue ORDER BY created_at DESC;

-- Check which apartments are configured for weekly calls
SELECT id, person_name, phone_number, wants_weekly_calls 
FROM apartments 
WHERE wants_weekly_calls = true
ORDER BY person_name;

-- If no apartments have wants_weekly_calls = true, that's why no calls are being made!
