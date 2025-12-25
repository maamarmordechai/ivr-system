-- Update IVR menu to include all functions
-- This adds register-host and register-meal-host to the main menu

-- First, check what menu we're updating
SELECT id, menu_name FROM ivr_menus_v2 WHERE menu_key = 'main' AND week_id IS NULL LIMIT 1;

-- Get the menu ID (replace with your actual menu ID from above query)
-- Example: 6293476d-bf97-4494-8509-3685172e9bf1

-- Update digit 2 to register as host
UPDATE ivr_menu_options
SET 
  option_name = 'Register as Host',
  action_type = 'custom_function',
  function_name = 'register_host'
WHERE menu_id = (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main' AND week_id IS NULL LIMIT 1)
  AND digit = '2';

-- Add digit 5 for meal host registration if it doesn't exist
INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, function_name, sort_order)
SELECT 
  id,
  '5',
  'Register for Meal Hosting',
  'custom_function',
  'register_meal_host',
  5
FROM ivr_menus_v2
WHERE menu_key = 'main' AND week_id IS NULL
ON CONFLICT DO NOTHING;

-- Update digit 5 if it already exists
UPDATE ivr_menu_options
SET 
  option_name = 'Register for Meal Hosting',
  action_type = 'custom_function',
  function_name = 'register_meal_host'
WHERE menu_id = (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main' AND week_id IS NULL LIMIT 1)
  AND digit = '5';

-- Add digit 6 for admin trigger busy Shabbos (if needed)
INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, function_name, sort_order)
SELECT 
  id,
  '6',
  'Admin: Trigger Busy Shabbos Campaign',
  'custom_function',
  'trigger_busy_campaign',
  6
FROM ivr_menus_v2
WHERE menu_key = 'main' AND week_id IS NULL
ON CONFLICT DO NOTHING;

-- Update the main menu prompt to include all options
UPDATE ivr_menus_v2
SET prompt_text = 'Hi and thank you for calling Hachnusas Orchim!
If you would like to register as a guest, please press number one.
If you would like to register as a host, please press number two.
If you would like to accept guest for this Shabbos, please press number three.
If you would like to take guests to eat the meals for Shabbos, please press number 4.
To register for meal hosting only, press number 5.
For urgent matters, please press 0 to Talk to A representative.'
WHERE menu_key = 'main' AND week_id IS NULL;

-- View all menu options
SELECT 
  m.menu_name,
  o.digit,
  o.option_name,
  o.action_type,
  o.function_name,
  o.submenu_id,
  o.voicemail_box_id
FROM ivr_menus_v2 m
LEFT JOIN ivr_menu_options o ON m.id = o.menu_id
WHERE m.menu_key = 'main' AND m.week_id IS NULL
ORDER BY o.digit;
