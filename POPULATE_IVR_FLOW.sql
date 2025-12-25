-- ===========================================
-- POPULATE IVR FLOW BUILDER WITH CURRENT FLOW
-- Run this AFTER running SETUP_NEW_FEATURES.sql
-- ===========================================

-- First, get the flow ID (created in SETUP_NEW_FEATURES.sql)
DO $$
DECLARE
  v_flow_id UUID;
  v_main_menu_id UUID;
  v_host_shabbos_id UUID;
  v_host_confirm_id UUID;
  v_host_update_beds_id UUID;
  v_host_unreg_beds_id UUID;
  v_host_unreg_private_id UUID;
  v_register_host_id UUID;
  v_register_beds_id UUID;
  v_register_private_id UUID;
  v_register_frequency_id UUID;
  v_leave_message_id UUID;
  v_admin_options_id UUID;
  v_process_response_id UUID;
  v_save_beds_id UUID;
BEGIN
  -- Get the flow ID
  SELECT id INTO v_flow_id FROM ivr_flows WHERE name = 'Weekly Availability' LIMIT 1;
  
  IF v_flow_id IS NULL THEN
    INSERT INTO ivr_flows (name, description, is_active, is_default) 
    VALUES ('Weekly Availability', 'Main IVR flow for weekly host availability calls', true, true)
    RETURNING id INTO v_flow_id;
  END IF;

  -- Delete existing steps for this flow (clean slate)
  DELETE FROM ivr_flow_steps WHERE flow_id = v_flow_id;

  -- ========================================
  -- CREATE ALL STEPS
  -- ========================================

  -- 1. Main Menu (Entry Point)
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, is_entry_point, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Main Menu', 'main_menu', 1, 
    'Welcome to the Machnisei Orchim phone line. Press 1 to host guests this Shabbos. Press 2 to register as a host. Press 0 for the office. Press 8 for admin.', 
    true, 15, 1)
  RETURNING id INTO v_main_menu_id;

  -- 2. Host This Shabbos
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Host This Shabbos', 'host_shabbos', 2, 
    'Thank you for wanting to host! How many beds can you offer? Enter the number and press pound.', 
    15, 3)
  RETURNING id INTO v_host_shabbos_id;

  -- 3. Host Confirm (Recognized)
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Confirm Hosting', 'host_confirm', 3, 
    'We recognize you! Press 1 to confirm your usual beds. Press 2 to update your bed count.', 
    15, 1)
  RETURNING id INTO v_host_confirm_id;

  -- 4. Host Update Beds
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Update Bed Count', 'host_update_beds', 4, 
    'How many beds can you offer this Shabbos? Enter the number and press pound.', 
    15, 3)
  RETURNING id INTO v_host_update_beds_id;

  -- 5. Host Unreg Beds (New caller)
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'New Host - Beds', 'host_unreg_beds', 5, 
    'We dont recognize your number. How many beds can you offer? Enter the number and press pound.', 
    15, 3)
  RETURNING id INTO v_host_unreg_beds_id;

  -- 6. Host Unreg Private/Home
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Private or Home?', 'host_unreg_private', 6, 
    'Is this a private accommodation? Press 1. Is it in your home? Press 2.', 
    15, 1)
  RETURNING id INTO v_host_unreg_private_id;

  -- 7. Register as Host
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Register - Start', 'register_host', 7, 
    'Thank you for registering! How many beds do you have available for guests? Enter the number and press pound.', 
    15, 3)
  RETURNING id INTO v_register_host_id;

  -- 8. Register Beds Saved
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Register - Private?', 'register_beds_save', 8, 
    'Is this a private accommodation? Press 1. Is it in your home? Press 2.', 
    15, 1)
  RETURNING id INTO v_register_beds_id;

  -- 9. Register Private
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Register - Frequency', 'register_private', 9, 
    'How often do you want calls? Press 1 for weekly when needed. Press 2 for special Shabbosim only.', 
    15, 1)
  RETURNING id INTO v_register_private_id;

  -- 10. Register Frequency Final
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Register - Complete', 'register_frequency', 10, 
    'Thank you for registering! When you get a call and confirm availability, we will personally contact you to arrange a guest.', 
    15, 1)
  RETURNING id INTO v_register_frequency_id;

  -- 11. Leave Message (Office)
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Leave Message', 'leave_message', 11, 
    'Please leave a clear message with your name and phone number, and we will get back to you.', 
    60, 0)
  RETURNING id INTO v_leave_message_id;

  -- 12. Admin Options
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Admin Options', 'admin_options', 12, 
    'Admin options coming soon.', 
    15, 1)
  RETURNING id INTO v_admin_options_id;

  -- 13. Process Response (Outbound calls)
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Availability Response', 'process_response', 13, 
    'Press 1 if you can host this Shabbos. Press 2 if you cannot. Press 3 for a Friday callback.', 
    15, 1)
  RETURNING id INTO v_process_response_id;

  -- 14. Save Beds
  INSERT INTO ivr_flow_steps (flow_id, step_name, step_key, step_order, prompt_text, timeout_seconds, max_digits)
  VALUES (v_flow_id, 'Enter Bed Count', 'save_beds', 14, 
    'Thank you! How many beds do you have available? Enter the number and press pound.', 
    15, 3)
  RETURNING id INTO v_save_beds_id;

  -- ========================================
  -- CREATE ALL ACTIONS
  -- ========================================

  -- Main Menu Actions
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id) VALUES
  (v_main_menu_id, '1', 'Host This Shabbos', 'goto_step', v_host_shabbos_id),
  (v_main_menu_id, '2', 'Register as Host', 'goto_step', v_register_host_id),
  (v_main_menu_id, '0', 'Leave Message', 'goto_step', v_leave_message_id),
  (v_main_menu_id, '8', 'Admin Options', 'goto_step', v_admin_options_id);

  -- Host Shabbos Actions (goes to confirm or unreg based on recognition)
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id) VALUES
  (v_host_shabbos_id, '1', 'Recognized - Confirm', 'goto_step', v_host_confirm_id),
  (v_host_shabbos_id, '#', 'Enter Beds', 'goto_step', v_host_unreg_private_id);

  -- Host Confirm Actions (updates weekly_beds)
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, action_audio_text, action_data) VALUES
  (v_host_confirm_id, '1', 'Confirm & Finish', 'hangup', 'Thank you, we will call you back to confirm a guest.', '{"db_action": "INSERT weekly_beds WITH default bed count", "description": "Save availability with host''s default beds"}');
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id) VALUES
  (v_host_confirm_id, '2', 'Update Beds', 'goto_step', v_host_update_beds_id);

  -- Host Update Beds - saves new bed count
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, action_audio_text, action_data) VALUES
  (v_host_update_beds_id, '#', 'Save & Finish', 'hangup', 'Beds updated. We will call you to confirm a guest.', '{"db_action": "INSERT weekly_beds WITH entered bed count", "description": "Save availability with custom bed count"}');

  -- Host Unreg Private Actions (sets is_private and saves host)
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, action_audio_text, action_data) VALUES
  (v_host_unreg_private_id, '1', 'Private - Save & Finish', 'hangup', 'Thank you. We will call you to personally confirm a guest.', '{"db_action": "INSERT host WITH is_private = true", "description": "Create new host with private accommodation"}'),
  (v_host_unreg_private_id, '2', 'Home - Save & Finish', 'hangup', 'Thank you. We will call you to personally confirm a guest.', '{"db_action": "INSERT host WITH is_private = false", "description": "Create new host with home accommodation"}');

  -- Register Host - goes to beds save
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id) VALUES
  (v_register_host_id, '#', 'Save Beds', 'goto_step', v_register_beds_id);

  -- Register Beds Save Actions (sets is_private in database)
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id, action_data) VALUES
  (v_register_beds_id, '1', 'Private Accommodation', 'goto_step', v_register_private_id, '{"db_action": "SET is_private = true", "description": "Guest will stay in separate/private accommodation"}'),
  (v_register_beds_id, '2', 'Home Accommodation', 'goto_step', v_register_private_id, '{"db_action": "SET is_private = false", "description": "Guest will stay in host''s home"}');

  -- Register Private Actions (sets call_frequency in database)
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id, action_data) VALUES
  (v_register_private_id, '1', 'Weekly Calls', 'goto_step', v_register_frequency_id, '{"db_action": "SET call_frequency = ''weekly''", "description": "Host will be called every week when beds are needed"}'),
  (v_register_private_id, '2', 'Special Only', 'goto_step', v_register_frequency_id, '{"db_action": "SET call_frequency = ''special''", "description": "Host will only be called for special Shabbosim or when desperate"}');

  -- Register Frequency - hangup
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type) VALUES
  (v_register_frequency_id, 'timeout', 'Complete', 'hangup');

  -- Leave Message - record
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type) VALUES
  (v_leave_message_id, 'timeout', 'Record Message', 'record');

  -- Admin - hangup
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type) VALUES
  (v_admin_options_id, 'timeout', 'Coming Soon', 'hangup');

  -- Process Response Actions (outbound) - saves availability response
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, target_step_id, action_audio_text, action_data) VALUES
  (v_process_response_id, '1', 'Yes - Available', 'goto_step', v_save_beds_id, 'Thank you!', '{"db_action": "UPDATE weekly_beds SET status = ''available''", "description": "Mark host as available this week"}'),
  (v_process_response_id, '2', 'No - Unavailable', 'hangup', NULL, 'Thank you for letting us know. Goodbye.', '{"db_action": "UPDATE weekly_beds SET status = ''unavailable''", "description": "Mark host as unavailable this week"}'),
  (v_process_response_id, '3', 'Friday Callback', 'hangup', NULL, 'Thank you. We will call you on Friday. Goodbye.', '{"db_action": "UPDATE weekly_beds SET status = ''callback_friday''", "description": "Schedule callback for Friday"}');

  -- Save Beds - saves the bed count
  INSERT INTO ivr_flow_actions (step_id, digit, action_name, action_type, action_audio_text, action_data) VALUES
  (v_save_beds_id, '#', 'Save & Finish', 'hangup', 'Thank you. We will call you to personally confirm a guest.', '{"db_action": "UPDATE weekly_beds SET beds = entered_value", "description": "Save the number of beds entered"}');

  RAISE NOTICE 'IVR Flow populated successfully with % steps', 14;
END $$;

-- Verify the flow was created
SELECT 
  f.name as flow_name,
  s.step_name,
  s.step_key,
  s.is_entry_point,
  (SELECT COUNT(*) FROM ivr_flow_actions WHERE step_id = s.id) as action_count
FROM ivr_flows f
JOIN ivr_flow_steps s ON s.flow_id = f.id
WHERE f.name = 'Weekly Availability'
ORDER BY s.step_order;
