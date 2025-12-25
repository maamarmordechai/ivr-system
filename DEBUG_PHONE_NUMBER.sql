-- RUN THIS IN SUPABASE SQL EDITOR TO DEBUG PHONE NUMBER ISSUE

-- 1. Check what phone numbers are in the apartments table
SELECT id, person_name, phone_number, address 
FROM apartments;

-- 2. Check recent incoming calls and what phone numbers they used
SELECT id, phone_number, call_sid, menu_selection, status, created_at
FROM incoming_calls
ORDER BY created_at DESC
LIMIT 10;

-- 3. Try to match phone numbers (will show if format is causing issues)
SELECT 
  a.phone_number as apartment_phone,
  ic.phone_number as caller_phone,
  a.phone_number = ic.phone_number as exact_match,
  a.person_name,
  ic.call_sid,
  ic.created_at
FROM incoming_calls ic
LEFT JOIN apartments a ON a.phone_number = ic.phone_number
ORDER BY ic.created_at DESC
LIMIT 10;

-- 4. If the above shows no matches, check for formatting issues
SELECT 
  a.phone_number as apartment_phone,
  LENGTH(a.phone_number) as apt_length,
  ic.phone_number as caller_phone,
  LENGTH(ic.phone_number) as caller_length,
  REPLACE(REPLACE(a.phone_number, ' ', ''), '-', '') as apt_normalized,
  REPLACE(REPLACE(ic.phone_number, ' ', ''), '-', '') as caller_normalized
FROM incoming_calls ic
CROSS JOIN apartments a
WHERE ic.phone_number LIKE '%845376%'
ORDER BY ic.created_at DESC
LIMIT 5;
