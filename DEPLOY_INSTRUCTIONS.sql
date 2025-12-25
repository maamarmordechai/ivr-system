-- ============================================
-- STEP 1: Deploy these 3 functions in Supabase Dashboard
-- ============================================
-- Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
-- 
-- 1. Click "Deploy a new function" → Name: register-host
--    Copy from: supabase\functions\register-host\index.ts
--
-- 2. Click "Deploy a new function" → Name: register-meal-host  
--    Copy from: supabase\functions\register-meal-host\index.ts
--
-- 3. Find "handle-ivr-selection" → Click Edit → Replace all code
--    Copy from: supabase\functions\handle-ivr-selection\index.ts
--
-- ============================================
-- STEP 2: Run this SQL after functions are deployed
-- ============================================

-- Get the root menu ID first
SELECT id, menu_name FROM ivr_menus_v2 ORDER BY created_at LIMIT 5;
-- The first one should be your main menu

-- Update option 2 to route to register-host
UPDATE ivr_menu_options
SET 
  action_type = 'custom_function',
  function_name = 'register_host',
  option_name = 'If you would like to register as a host, please press number two.'
WHERE digit = '2'
AND menu_id = '6293476d-bf97-4494-8509-3685172e9bf1';

-- Add option 5 for meal host registration
INSERT INTO ivr_menu_options (
  menu_id,
  digit,
  option_name,
  action_type,
  function_name,
  sort_order,
  is_active
) VALUES (
  '6293476d-bf97-4494-8509-3685172e9bf1',
  '5',
  'If you would like to register to host guests for meals, please press number five.',
  'custom_function',
  'register_meal_host',
  50,
  true
) ON CONFLICT (menu_id, digit) DO UPDATE
SET 
  action_type = 'custom_function',
  function_name = 'register_meal_host',
  option_name = 'If you would like to register to host guests for meals, please press number five.',
  is_active = true;

-- Verify the changes
SELECT 
  digit,
  option_name,
  action_type,
  function_name,
  is_active
FROM ivr_menu_options
WHERE menu_id = '6293476d-bf97-4494-8509-3685172e9bf1'
ORDER BY digit;

-- ============================================
-- EXPECTED RESULT:
-- ============================================
-- digit | option_name                                | action_type      | function_name
-- ------|-------------------------------------------|------------------|------------------
-- 0     | For urgent matters, press 0...            | voicemail/transfer| 
-- 1     | To register as a guest...                 | voicemail        |
-- 2     | To register as a host...                  | custom_function  | register_host
-- 3     | To accept guest for this Shabbos...       | custom_function  | beds
-- 4     | To take guests to eat the meals...        | custom_function  | meals
-- 5     | To register to host guests for meals...   | custom_function  | register_meal_host
