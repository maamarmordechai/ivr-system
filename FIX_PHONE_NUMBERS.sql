-- Fix phone numbers - add +1 country code if missing
UPDATE apartments
SET phone_number = '+1' || phone_number
WHERE phone_number IS NOT NULL 
  AND phone_number NOT LIKE '+%'
  AND LENGTH(phone_number) = 10;

-- Verify the fix
SELECT id, person_name, phone_number 
FROM apartments 
WHERE wants_weekly_calls = true;
