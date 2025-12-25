-- ===================================================================
-- DEBUG NEW HOST REGISTRATION ERROR
-- ===================================================================

-- 1. Check if phone number exists in apartments table
SELECT * FROM apartments WHERE phone_number = '+18453762437';

-- 2. Check if there are any bed_confirmations for this phone (orphaned records)
SELECT bc.* 
FROM bed_confirmations bc
LEFT JOIN apartments a ON bc.apartment_id = a.id
WHERE a.phone_number = '+18453762437' OR bc.apartment_id IS NULL;

-- 3. Check if there are any meal_hosts for this phone
SELECT * FROM meal_hosts WHERE phone_number = '+18453762437';

-- 4. Check apartments table constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'apartments'::regclass;

-- 4b. Check which columns are NOT NULL
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'apartments'
AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 5. Try to manually insert the apartment to see what error we get
-- (This will fail if there's a constraint issue)
INSERT INTO apartments (phone_number, number_of_beds, wants_weekly_calls, person_name)
VALUES ('+18453762437', 2, false, 'Test Host')
RETURNING *;

-- If above fails, try with a different phone to test if table works at all
INSERT INTO apartments (phone_number, number_of_beds, wants_weekly_calls, person_name)
VALUES ('+15555555555', 2, false, 'Test Host 2')
RETURNING *;

-- 6. Check if the increment_beds_confirmed function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'increment_beds_confirmed'
AND routine_schema = 'public';

-- 7. Clean up test data
DELETE FROM apartments WHERE phone_number IN ('+15555555555');
