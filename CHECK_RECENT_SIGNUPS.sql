-- Check all recent apartment registrations
SELECT id, person_name, phone_number, address, number_of_beds, created_at
FROM apartments 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- Check voicemails structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'voicemails'
ORDER BY ordinal_position;

-- Check all recent voicemails
SELECT * FROM voicemails
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
