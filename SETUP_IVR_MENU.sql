-- Ensure IVR menu has bed availability option configured
-- Run this in Supabase SQL Editor if your menu options aren't working

-- Update digit 3 to use 'beds' function (currently using 'check_host_availability')
UPDATE ivr_menu_options
SET 
  function_name = 'beds',
  option_name = 'Manage Guest Beds',
  action_type = 'custom_function'
WHERE menu_id = (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main')
  AND digit = '3';

-- Ensure digit 4 is set to 'meals' function
UPDATE ivr_menu_options
SET 
  function_name = 'meals',
  option_name = 'Manage Shabbat Meals',
  action_type = 'custom_function'
WHERE menu_id = (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main')
  AND digit = '4';

-- Ensure digit 8 is set to 'admin' function
UPDATE ivr_menu_options
SET 
  function_name = 'admin',
  option_name = 'Administrative Functions',
  action_type = 'custom_function'
WHERE menu_id = (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'main')
  AND digit = '8';

-- Verify the configuration
SELECT 
  im.menu_name,
  imo.digit,
  imo.option_name,
  imo.function_name,
  imo.action_type,
  imo.is_active
FROM ivr_menus_v2 im
LEFT JOIN ivr_menu_options imo ON im.id = imo.menu_id
WHERE im.menu_key = 'main'
  AND imo.action_type = 'custom_function'
ORDER BY imo.digit;
