-- Check for the newly registered host
SELECT id, person_name, phone_number, address, number_of_beds, created_at
FROM apartments 
WHERE phone_number = '+18453762437'
ORDER BY created_at DESC;

-- Check for bed confirmations from this phone
SELECT bc.*, w.week_start_date
FROM bed_confirmations bc
JOIN desperate_weeks w ON bc.week_id = w.id
WHERE bc.apartment_id IN (
  SELECT id FROM apartments WHERE phone_number = '+18453762437'
)
ORDER BY bc.created_at DESC;

-- Check for any voicemail recordings
SELECT * FROM voicemails
ORDER BY created_at DESC
LIMIT 10;

-- Check incoming_calls table structure first
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'incoming_calls';

-- Check incoming_calls for recent calls (using correct column name)
SELECT * FROM incoming_calls
ORDER BY created_at DESC
LIMIT 5;
