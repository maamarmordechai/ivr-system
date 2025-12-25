-- Check if your phone number is registered correctly
-- Replace +18453762437 with your actual phone number

SELECT 
  id,
  person_name,
  phone_number,
  number_of_beds,
  wants_weekly_calls,
  last_helped_date
FROM apartments 
WHERE phone_number LIKE '%8453762437%';

-- Also check without the +1
SELECT 
  id,
  person_name,
  phone_number,
  number_of_beds
FROM apartments;
