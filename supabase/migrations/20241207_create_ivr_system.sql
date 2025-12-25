-- Add per-week IVR configuration support to existing IVR system
-- Extends ivr_menus_v2 to support week-specific configurations

-- Add week_id column to ivr_menus_v2 to allow per-week configurations
ALTER TABLE ivr_menus_v2 ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES weekly_bed_needs(id) ON DELETE CASCADE;
ALTER TABLE ivr_menus_v2 ADD COLUMN IF NOT EXISTS is_week_specific BOOLEAN DEFAULT false;

COMMENT ON COLUMN ivr_menus_v2.week_id IS 'If set, this menu is only active for this specific week';
COMMENT ON COLUMN ivr_menus_v2.is_week_specific IS 'True if this is a week-specific override';

-- Create index for week-based lookups
CREATE INDEX IF NOT EXISTS idx_ivr_menus_v2_week ON ivr_menus_v2(week_id);

-- Add email notifications to voicemail_boxes
ALTER TABLE voicemail_boxes ADD COLUMN IF NOT EXISTS email_notifications TEXT[];
ALTER TABLE voicemail_boxes ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 0;

COMMENT ON COLUMN voicemail_boxes.email_notifications IS 'Array of email addresses to notify';
COMMENT ON COLUMN voicemail_boxes.priority_level IS 'Higher = more priority (e.g., 100 for "our community")';

-- Update existing "Our Community" box to have higher priority
UPDATE voicemail_boxes 
SET priority_level = 100 
WHERE box_name = 'Our Community' OR box_name LIKE '%our%community%';

-- Create a function to get the active menu for a given week
CREATE OR REPLACE FUNCTION get_active_menu_for_week(target_week_id UUID, menu_key_param TEXT DEFAULT 'main')
RETURNS TABLE (
  id UUID,
  menu_name TEXT,
  menu_key TEXT,
  prompt_text TEXT,
  voice_name TEXT,
  timeout_seconds INTEGER,
  max_digits INTEGER
) AS $$
BEGIN
  -- First, try to find a week-specific menu
  RETURN QUERY
  SELECT m.id, m.menu_name, m.menu_key, m.prompt_text, m.voice_name, m.timeout_seconds, m.max_digits
  FROM ivr_menus_v2 m
  WHERE m.menu_key = menu_key_param
    AND m.week_id = target_week_id
    AND m.is_week_specific = true
  LIMIT 1;
  
  -- If no week-specific menu, return default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT m.id, m.menu_name, m.menu_key, m.prompt_text, m.voice_name, m.timeout_seconds, m.max_digits
    FROM ivr_menus_v2 m
    WHERE m.menu_key = menu_key_param
      AND m.week_id IS NULL
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_menu_for_week IS 'Gets the active menu for a week - returns week-specific if exists, otherwise default';

-- Create helper function to copy default menu to a specific week
CREATE OR REPLACE FUNCTION copy_menu_for_week(source_menu_key TEXT, target_week_id UUID)
RETURNS UUID AS $$
DECLARE
  source_menu_id UUID;
  new_menu_id UUID;
  option_record RECORD;
BEGIN
  -- Get source menu (default, non-week-specific)
  SELECT id INTO source_menu_id
  FROM ivr_menus_v2
  WHERE menu_key = source_menu_key
    AND week_id IS NULL
  LIMIT 1;
  
  IF source_menu_id IS NULL THEN
    RAISE EXCEPTION 'Source menu not found: %', source_menu_key;
  END IF;
  
  -- Copy the menu
  INSERT INTO ivr_menus_v2 (menu_name, menu_key, week_id, is_week_specific, prompt_text, voice_name, timeout_seconds, max_digits, parent_menu_id, parent_digit)
  SELECT 
    menu_name || ' (Week Override)', 
    menu_key,
    target_week_id,
    true,
    prompt_text,
    voice_name,
    timeout_seconds,
    max_digits,
    parent_menu_id,
    parent_digit
  FROM ivr_menus_v2
  WHERE id = source_menu_id
  RETURNING id INTO new_menu_id;
  
  -- Copy menu options
  FOR option_record IN 
    SELECT * FROM ivr_menu_options WHERE menu_id = source_menu_id
  LOOP
    INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, voicemail_box_id, submenu_id, transfer_number, function_name, sort_order)
    VALUES (
      new_menu_id,
      option_record.digit,
      option_record.option_name,
      option_record.action_type,
      option_record.voicemail_box_id,
      option_record.submenu_id,
      option_record.transfer_number,
      option_record.function_name,
      option_record.sort_order
    );
  END LOOP;
  
  RETURN new_menu_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION copy_menu_for_week IS 'Copies a default menu to create a week-specific override';
