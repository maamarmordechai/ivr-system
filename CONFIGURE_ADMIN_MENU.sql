-- Configure Admin Submenu with Options 3 (Check Voicemails) and 4 (Email Report)
-- This adds both the voicemail checking feature and email report to the admin menu

DO $$
DECLARE
  admin_menu_id UUID;
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
      'Admin menu. Press 1 to update bed count. Press 2 to update meal count. Press 3 to check voicemails. Press 4 to email weekly report.',
      false,
      'man',
      'man',
      10,
      1
    )
    RETURNING id INTO admin_menu_id;
    
    RAISE NOTICE 'Created admin submenu with ID: %', admin_menu_id;
  ELSE
    -- Update existing admin menu prompt to include all 4 options
    UPDATE ivr_menus_v2
    SET prompt_text = 'Admin menu. Press 1 to update bed count. Press 2 to update meal count. Press 3 to check voicemails. Press 4 to email weekly report.'
    WHERE id = admin_menu_id;
    
    RAISE NOTICE 'Updated admin submenu prompt';
  END IF;
  
  -- Add option 3: Check voicemails
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
      '3',
      'Check Voicemails',
      NULL,
      false,
      'custom_function',
      'check_voicemails_ivr',
      3
    )
    ON CONFLICT (menu_id, digit) 
    DO UPDATE SET 
      option_name = 'Check Voicemails',
      action_type = 'custom_function',
      function_name = 'check_voicemails_ivr',
      sort_order = 3;
    
    RAISE NOTICE 'Added/Updated option 3 (check voicemails) to admin menu';
  END IF;
  
  -- Add option 4: Email report
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
      NULL,
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
    
    RAISE NOTICE 'Added/Updated option 4 (email report) to admin menu';
  END IF;
  
END $$;

-- Add function descriptions for both new functions
INSERT INTO ivr_function_descriptions (function_name, display_name, description, created_at)
VALUES 
  ('check_voicemails_ivr', 'Check Voicemails', 'Play voicemails over the phone with options to delete, save, or skip to next message', NOW()),
  ('email_report_trigger', 'Email Weekly Report', 'Trigger weekly report email with 2-step confirmation flow (press 1 to confirm, 2 to cancel)', NOW())
ON CONFLICT (function_name) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- Verify the changes
SELECT 
  m.menu_name,
  m.menu_key,
  m.prompt_text,
  o.digit,
  o.option_name,
  o.function_name,
  o.sort_order
FROM ivr_menus_v2 m
LEFT JOIN ivr_menu_options o ON o.menu_id = m.id
WHERE m.menu_key = 'admin'
ORDER BY o.sort_order;
