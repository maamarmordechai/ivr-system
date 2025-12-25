-- Check what fields exist in ivr_menus_v2 table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ivr_menus_v2'
ORDER BY ordinal_position;

-- Check the actual main menu data
SELECT * FROM ivr_menus_v2 WHERE menu_key = 'main';
