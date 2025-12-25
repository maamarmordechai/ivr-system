-- Check your apartment settings to see why couple question isn't being asked

SELECT 
  id,
  person_name,
  phone_number,
  is_family_friendly,
  number_of_beds
FROM apartments
WHERE phone_number = '+18453762437';

-- If is_family_friendly is TRUE, that's why it's skipping the couple question
-- To fix, run this:

UPDATE apartments
SET is_family_friendly = FALSE
WHERE phone_number = '+18453762437';
