-- Update IVR menu option 2 to route to the new register-host function
-- This separates host registration from the bed availability check

UPDATE ivr_menu_options
SET 
  action_type = 'custom_function',
  function_name = 'register_host',
  option_name = 'If you would like to register as a host, please press number two.'
WHERE digit = '2'
AND menu_id IN (SELECT id FROM ivr_menus_v2 WHERE is_root = true);

-- Verify the update
SELECT 
  digit,
  option_name,
  action_type,
  function_name
FROM ivr_menu_options
WHERE menu_id IN (SELECT id FROM ivr_menus_v2 WHERE is_root = true)
ORDER BY digit;
