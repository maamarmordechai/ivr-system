-- ADD TEST GUESTS FOR IVR TESTING

-- First, clear any existing test guests (optional - comment out if you want to keep them)
-- DELETE FROM guests WHERE name LIKE 'Test%';

-- Add 4 test guests with check-in dates within the next 7 days
-- These will be picked up by the IVR system when you call

-- Test Guest 1: Individual checking in tomorrow
INSERT INTO guests (
  name,
  phone_number,
  number_of_people,
  guest_type,
  is_couple,
  arrival_date,
  check_in_date,
  check_out_date
) VALUES (
  'Test Guest - David Cohen',
  '+972501234567',
  1,
  'individual',
  FALSE,
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '8 days'
);

-- Test Guest 2: Individual checking in in 2 days
INSERT INTO guests (
  name,
  phone_number,
  number_of_people,
  guest_type,
  is_couple,
  arrival_date,
  check_in_date,
  check_out_date
) VALUES (
  'Test Guest - Sarah Levi',
  '+972502345678',
  1,
  'individual',
  FALSE,
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '9 days'
);

-- Test Guest 3: Couple checking in in 3 days
INSERT INTO guests (
  name,
  phone_number,
  number_of_people,
  guest_type,
  is_couple,
  arrival_date,
  check_in_date,
  check_out_date
) VALUES (
  'Test Couple - Yossi & Rachel',
  '+972503456789',
  2,
  'individual',
  TRUE,
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '10 days'
);

-- Test Guest 4: Another individual checking in in 4 days
INSERT INTO guests (
  name,
  phone_number,
  number_of_people,
  guest_type,
  is_couple,
  arrival_date,
  check_in_date,
  check_out_date
) VALUES (
  'Test Guest - Michael Stern',
  '+972504567890',
  1,
  'individual',
  FALSE,
  CURRENT_DATE + INTERVAL '4 days',
  CURRENT_DATE + INTERVAL '4 days',
  CURRENT_DATE + INTERVAL '11 days'
);

-- Verify the guests were created and show their info
SELECT 
  g.name,
  g.guest_type,
  g.is_couple,
  g.check_in_date,
  g.check_out_date,
  COUNT(a.id) as assignment_count,
  CASE 
    WHEN COUNT(a.id) = 0 THEN 'AVAILABLE FOR ASSIGNMENT'
    ELSE 'Already Assigned'
  END as status
FROM guests g
LEFT JOIN assignments a ON a.guest_id = g.id
WHERE g.name LIKE 'Test%'
GROUP BY g.id, g.name, g.guest_type, g.is_couple, g.check_in_date, g.check_out_date
ORDER BY g.check_in_date;

-- Count how many pending guests are in the next 7 days
SELECT 
  COUNT(*) as pending_count,
  'Guests available for assignment in next 7 days' as description
FROM guests g
LEFT JOIN assignments a ON a.guest_id = g.id
WHERE a.id IS NULL
  AND g.check_in_date <= CURRENT_DATE + INTERVAL '7 days'
  AND g.check_out_date >= CURRENT_DATE;
