-- Fix foreign key constraints to allow deleting apartments
-- This updates the call_queue foreign key to CASCADE on delete

-- Drop the existing constraint
ALTER TABLE call_queue
DROP CONSTRAINT IF EXISTS call_queue_apartment_id_fkey;

-- Re-add it with CASCADE delete
ALTER TABLE call_queue
ADD CONSTRAINT call_queue_apartment_id_fkey 
FOREIGN KEY (apartment_id) 
REFERENCES apartments(id) 
ON DELETE CASCADE;

-- Do the same for other tables that reference apartments
ALTER TABLE bed_confirmations
DROP CONSTRAINT IF EXISTS bed_confirmations_apartment_id_fkey;

ALTER TABLE bed_confirmations
ADD CONSTRAINT bed_confirmations_apartment_id_fkey 
FOREIGN KEY (apartment_id) 
REFERENCES apartments(id) 
ON DELETE SET NULL;

ALTER TABLE weekly_availability_calls
DROP CONSTRAINT IF EXISTS weekly_availability_calls_apartment_id_fkey;

ALTER TABLE weekly_availability_calls
ADD CONSTRAINT weekly_availability_calls_apartment_id_fkey 
FOREIGN KEY (apartment_id) 
REFERENCES apartments(id) 
ON DELETE SET NULL;

-- Verify constraints
SELECT
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'apartment_id'
ORDER BY tc.table_name;
