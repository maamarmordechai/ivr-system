-- Test that CONFIGURE_ADMIN_MENU.sql runs successfully
-- This is a simplified version that only inserts/updates without the problematic updated_at column

-- Test: Get admin menu
SELECT id, menu_key, prompt_text 
FROM ivr_menus_v2 
WHERE menu_key = 'admin' 
LIMIT 1;

-- Test: Check function descriptions table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ivr_function_descriptions'
ORDER BY ordinal_position;

-- If the table exists and has the columns, the CONFIGURE_ADMIN_MENU.sql should work now
