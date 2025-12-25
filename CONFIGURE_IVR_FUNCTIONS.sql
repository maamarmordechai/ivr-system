-- Make Beds, Meals, and Admin fully configurable in IVR Builder
-- Remove hardcoded digit restrictions

-- Add custom function names for beds, meals, and admin
-- These can be assigned to ANY digit in the IVR Builder

-- Example: To configure digit 3 for beds
INSERT INTO ivr_menu_options (
  menu_id,
  digit,
  option_name,
  action_type,
  function_name,
  is_active
) VALUES (
  (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main' LIMIT 1),
  '3',
  'Manage Guest Beds',
  'custom_function',
  'beds',
  true
) ON CONFLICT DO NOTHING;

-- Example: To configure digit 4 for meals
INSERT INTO ivr_menu_options (
  menu_id,
  digit,
  option_name,
  action_type,
  function_name,
  is_active
) VALUES (
  (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main' LIMIT 1),
  '4',
  'Manage Shabbat Meals',
  'custom_function',
  'meals',
  true
) ON CONFLICT DO NOTHING;

-- Example: To configure digit 8 for admin
INSERT INTO ivr_menu_options (
  menu_id,
  digit,
  option_name,
  action_type,
  function_name,
  is_active
) VALUES (
  (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main' LIMIT 1),
  '8',
  'Administrative Functions',
  'custom_function',
  'admin',
  true
) ON CONFLICT DO NOTHING;

-- NOTE: You can now assign beds/meals/admin to ANY digit you want!
-- Just change the digit value above or use the IVR Builder UI
-- You can also put them in submenus by setting parent_menu_id

