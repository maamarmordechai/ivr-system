-- Query to see current IVR menu text
SELECT id, menu_key, menu_name, prompt_text 
FROM ivr_menus_v2 
WHERE menu_key = 'main';
