-- Get a sample apartment to see all the fields and their values
SELECT * FROM apartments LIMIT 1;

-- Check for any triggers on the apartments table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'apartments';
