-- ===================================================================
-- FIX DUPLICATE MEAL HOSTS - Merge duplicate phone numbers
-- ===================================================================

-- 1. VIEW ALL MEAL HOSTS TO SEE DUPLICATES
SELECT id, host_name, phone_number, created_at 
FROM meal_hosts 
ORDER BY phone_number, created_at;

-- 2. VIEW ALL MEAL AVAILABILITIES TO SEE WHICH HOST_ID THEY USE
SELECT ma.id, ma.week_id, ma.host_id, mh.phone_number, mh.host_name, 
       ma.day_meal_guests, ma.night_meal_guests, ma.status
FROM meal_availabilities ma
JOIN meal_hosts mh ON ma.host_id = mh.id
ORDER BY mh.phone_number, ma.created_at;

-- 3. CLEAN UP DUPLICATES (Run this after reviewing above)
-- This will keep the OLDEST host record for each phone number
-- and update all meal_availabilities to point to it

-- First, let's see what would be merged:
WITH duplicate_hosts AS (
  SELECT 
    phone_number,
    MIN(created_at) as first_created,
    COUNT(*) as duplicate_count
  FROM meal_hosts
  GROUP BY phone_number
  HAVING COUNT(*) > 1
)
SELECT 
  mh.id,
  mh.host_name,
  mh.phone_number,
  mh.created_at,
  CASE 
    WHEN mh.created_at = dh.first_created THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM meal_hosts mh
JOIN duplicate_hosts dh ON mh.phone_number = dh.phone_number
ORDER BY mh.phone_number, mh.created_at;

-- 4. ACTUALLY MERGE DUPLICATES
-- This will merge all duplicates for phone +18453762437

-- First, see which host IDs exist for this number:
SELECT id, host_name, phone_number, created_at 
FROM meal_hosts 
WHERE phone_number = '+18453762437'
ORDER BY created_at;

-- See which one has availabilities:
SELECT ma.*, mh.created_at as host_created
FROM meal_availabilities ma
JOIN meal_hosts mh ON ma.host_id = mh.id
WHERE mh.phone_number = '+18453762437'
ORDER BY ma.created_at;

-- MERGE: Keep the oldest host, delete the newer one
WITH hosts_to_keep AS (
  SELECT id as keep_id
  FROM meal_hosts
  WHERE phone_number = '+18453762437'
  ORDER BY created_at
  LIMIT 1
),
hosts_to_delete AS (
  SELECT id as delete_id
  FROM meal_hosts
  WHERE phone_number = '+18453762437'
  AND id NOT IN (SELECT keep_id FROM hosts_to_keep)
)
-- Update any meal_availabilities to point to the kept host
UPDATE meal_availabilities
SET host_id = (SELECT keep_id FROM hosts_to_keep)
WHERE host_id IN (SELECT delete_id FROM hosts_to_delete);

-- Now delete the duplicate host
DELETE FROM meal_hosts
WHERE phone_number = '+18453762437'
AND id NOT IN (
  SELECT id FROM meal_hosts
  WHERE phone_number = '+18453762437'
  ORDER BY created_at
  LIMIT 1
);

-- 5. VERIFY NO DUPLICATES REMAIN
SELECT phone_number, COUNT(*) as count
FROM meal_hosts
GROUP BY phone_number
HAVING COUNT(*) > 1;
