-- Add Email Report trigger to ADMIN submenu (not main menu)
-- This allows admins to request weekly report by email via phone
-- After pressing 8 (admin) and entering password, they get options including email report

-- First, find or create the admin submenu
DO $$
DECLARE
  admin_menu_id UUID;
  admin_option_exists BOOLEAN;
BEGIN
  -- Get the admin submenu (menu_key = 'admin')
  SELECT id INTO admin_menu_id FROM ivr_menus_v2 WHERE menu_key = 'admin' AND week_id IS NULL LIMIT 1;
  
  -- If admin menu doesn't exist, create it
  IF admin_menu_id IS NULL THEN
    INSERT INTO ivr_menus_v2 (
      menu_name,
      menu_key,
      prompt_text,
      use_audio_file,
      voice_name,
      voice_gender,
      timeout_seconds,
      max_digits
    ) VALUES (
      'Admin Menu',
      'admin',
      'Admin menu. Press 1 to update bed count, Press 2 to update meal count, Press 3 to check voicemails, Press 4 to get weekly report by email.',
      false,
      'man',
      'man',
      10,
      1
    )
    RETURNING id INTO admin_menu_id;
    
    RAISE NOTICE 'Created admin submenu with ID: %', admin_menu_id;
  END IF;
  
  -- Add option 4 to admin menu for email report
  IF admin_menu_id IS NOT NULL THEN
    INSERT INTO ivr_menu_options (
      menu_id,
      digit,
      option_name,
      option_audio_url,
      use_audio_file,
      action_type,
      function_name,
      sort_order
    ) VALUES (
      admin_menu_id,
      '4',
      'Email Weekly Report',
      '',
      false,
      'custom_function',
      'email_report_trigger',
      4
    )
    ON CONFLICT (menu_id, digit) 
    DO UPDATE SET
      option_name = 'Email Weekly Report',
      action_type = 'custom_function',
      function_name = 'email_report_trigger',
      sort_order = 4;
    
    RAISE NOTICE 'Email report trigger added to admin menu (digit 4)';
  END IF;
END $$;

-- Update function description
INSERT INTO ivr_function_descriptions (function_name, display_name, description, category)
VALUES (
  'email_report_trigger',
  'Email Weekly Report',
  'ADMIN ONLY: Sends the current week''s accommodation report by email. Asks for confirmation before sending. Includes bed confirmations with addresses, meal confirmations, and summary statistics.',
  'Admin'
)
ON CONFLICT (function_name) 
DO UPDATE SET
  display_name = 'Email Weekly Report',
  description = 'ADMIN ONLY: Sends the current week''s accommodation report by email. Asks for confirmation before sending. Includes bed confirmations with addresses, meal confirmations, and summary statistics.',
  category = 'Admin';

-- Verify setup
SELECT 
  'Admin Menu Options' as section,
  imo.digit,
  imo.option_name,
  imo.function_name,
  imo.action_type
FROM ivr_menu_options imo
JOIN ivr_menus_v2 im ON imo.menu_id = im.id
WHERE im.menu_key = 'admin' AND im.week_id IS NULL
ORDER BY imo.sort_order;

-- Show the admin menu prompt
SELECT 
  'Admin Menu Prompt' as section,
  menu_name,
  prompt_text
FROM ivr_menus_v2
WHERE menu_key = 'admin' AND week_id IS NULL;
