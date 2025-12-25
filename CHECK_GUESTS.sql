-- CHECK GUESTS STATUS

-- 1. See all guests and their apartment assignments
SELECT 
  id,
  full_name,
  guest_type,
  is_couple,
  apartment_id,
  check_in_date,
  check_out_date,
  created_at
FROM guests
ORDER BY created_at DESC;

-- 2. Count pending guests (not assigned to any apartment)
SELECT COUNT(*) as pending_guests_count
FROM guests
WHERE apartment_id IS NULL;

-- 3. If guests don't have dates, we need to add them
-- Run this to set check-in/out dates for existing guests:
UPDATE guests
SET 
  check_in_date = CURRENT_DATE,
  check_out_date = CURRENT_DATE + INTERVAL '7 days'
WHERE check_in_date IS NULL;
