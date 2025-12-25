-- Check IVR menu configuration
-- Run this to see what's configured

-- Check main menu
SELECT * FROM ivr_menus_v2 WHERE menu_key = 'main';

-- Check menu options
SELECT 
  imo.*,
  im.menu_name as menu_name
FROM ivr_menu_options imo
JOIN ivr_menus_v2 im ON imo.menu_id = im.id
WHERE im.menu_key = 'main'
  AND imo.is_active = true
ORDER BY imo.digit;
