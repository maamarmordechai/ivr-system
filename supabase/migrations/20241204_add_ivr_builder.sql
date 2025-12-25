-- IVR Menu Builder System
-- Allows complete customization of IVR menu structure with custom names and prompts

-- Drop existing tables if they exist
DROP TABLE IF EXISTS ivr_menu_options CASCADE;
DROP TABLE IF EXISTS ivr_menus_v2 CASCADE;

-- IVR Menus Table (each menu level)
CREATE TABLE ivr_menus_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_name TEXT NOT NULL, -- User-friendly name like "Main Menu", "Guest Services", "Billing"
  menu_key TEXT NOT NULL UNIQUE, -- System key like "main", "guest_services", "billing"
  parent_menu_id UUID REFERENCES ivr_menus_v2(id) ON DELETE CASCADE,
  parent_digit TEXT, -- Which digit from parent menu leads here (e.g., "1", "2")
  prompt_text TEXT NOT NULL, -- Text-to-speech prompt
  prompt_audio_url TEXT, -- Optional custom audio file URL
  voice_name TEXT DEFAULT 'alice', -- Twilio voice name
  timeout_seconds INTEGER DEFAULT 10,
  max_digits INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVR Menu Options (what happens when user presses each digit)
CREATE TABLE ivr_menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES ivr_menus_v2(id) ON DELETE CASCADE,
  digit TEXT NOT NULL CHECK (digit IN ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#')),
  option_name TEXT NOT NULL, -- User-friendly name like "Leave Voicemail", "Speak to Agent"
  action_type TEXT NOT NULL CHECK (action_type IN ('voicemail', 'submenu', 'transfer', 'hangup', 'custom_function')),
  
  -- For voicemail action
  voicemail_box_id UUID REFERENCES voicemail_boxes(id) ON DELETE SET NULL,
  
  -- For submenu action
  submenu_id UUID REFERENCES ivr_menus_v2(id) ON DELETE SET NULL,
  
  -- For transfer action
  transfer_number TEXT,
  
  -- For custom function action
  function_name TEXT, -- e.g., "check_host_availability", "guest_registration"
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(menu_id, digit)
);

-- Indexes for performance
CREATE INDEX idx_ivr_menus_v2_parent ON ivr_menus_v2(parent_menu_id);
CREATE INDEX idx_ivr_menus_v2_key ON ivr_menus_v2(menu_key);
CREATE INDEX idx_ivr_menu_options_menu ON ivr_menu_options(menu_id);
CREATE INDEX idx_ivr_menu_options_digit ON ivr_menu_options(digit);

-- Function to get full menu path
CREATE OR REPLACE FUNCTION get_ivr_menu_path(p_menu_id UUID)
RETURNS TABLE(
  level INTEGER,
  menu_id UUID,
  menu_name TEXT,
  menu_key TEXT,
  digit TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE menu_path AS (
    -- Base case: start with the given menu
    SELECT 
      1 as level,
      m.id,
      m.menu_name,
      m.menu_key,
      m.parent_digit as digit,
      m.parent_menu_id
    FROM ivr_menus_v2 m
    WHERE m.id = p_menu_id
    
    UNION ALL
    
    -- Recursive case: get parent menus
    SELECT 
      mp.level + 1,
      m.id,
      m.menu_name,
      m.menu_key,
      m.parent_digit as digit,
      m.parent_menu_id
    FROM ivr_menus_v2 m
    INNER JOIN menu_path mp ON m.id = mp.parent_menu_id
  )
  SELECT 
    mp.level,
    mp.id,
    mp.menu_name,
    mp.menu_key,
    mp.digit
  FROM menu_path mp
  ORDER BY mp.level DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert default IVR structure (can be customized via UI)
-- Main Menu
INSERT INTO ivr_menus_v2 (menu_name, menu_key, prompt_text) VALUES
('Main Menu', 'main', 'Welcome to our accommodation service. Press 1 for guest services. Press 2 for host registration. Press 3 for urgent matters. Press 0 for the main office.');

-- Sub-menus
INSERT INTO ivr_menus_v2 (menu_name, menu_key, parent_menu_id, parent_digit, prompt_text)
SELECT 
  'Guest Services', 'guest_services', id, '1',
  'You have reached guest services. Press 1 for billing questions. Press 2 for technical support. Press 9 to return to the main menu.'
FROM ivr_menus_v2 WHERE menu_key = 'main';

-- Main Menu Options
INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, submenu_id)
SELECT 
  main.id,
  '1',
  'Guest Services',
  'submenu',
  sub.id
FROM ivr_menus_v2 main
CROSS JOIN ivr_menus_v2 sub
WHERE main.menu_key = 'main' AND sub.menu_key = 'guest_services';

INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, voicemail_box_id)
SELECT 
  m.id,
  '2',
  'Host Registration',
  'voicemail',
  vb.id
FROM ivr_menus_v2 m
CROSS JOIN voicemail_boxes vb
WHERE m.menu_key = 'main' AND vb.box_number = '2';

INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, function_name)
SELECT 
  m.id,
  '3',
  'Urgent / Host Availability',
  'custom_function',
  'check_host_availability'
FROM ivr_menus_v2 m
WHERE m.menu_key = 'main';

INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, voicemail_box_id)
SELECT 
  m.id,
  '0',
  'Main Office',
  'voicemail',
  vb.id
FROM ivr_menus_v2 m
CROSS JOIN voicemail_boxes vb
WHERE m.menu_key = 'main' AND vb.box_number = '0';

-- Guest Services Sub-menu Options
INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, voicemail_box_id)
SELECT 
  m.id,
  '1',
  'Billing',
  'voicemail',
  vb.id
FROM ivr_menus_v2 m
CROSS JOIN voicemail_boxes vb
WHERE m.menu_key = 'guest_services' AND vb.box_number = '11';

INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, voicemail_box_id)
SELECT 
  m.id,
  '2',
  'Technical Support',
  'voicemail',
  vb.id
FROM ivr_menus_v2 m
CROSS JOIN voicemail_boxes vb
WHERE m.menu_key = 'guest_services' AND vb.box_number = '12';

-- Add "return to main menu" option
INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, submenu_id)
SELECT 
  sub.id,
  '9',
  'Return to Main Menu',
  'submenu',
  main.id
FROM ivr_menus_v2 sub
CROSS JOIN ivr_menus_v2 main
WHERE sub.menu_key = 'guest_services' AND main.menu_key = 'main';

-- Enable RLS
ALTER TABLE ivr_menus_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivr_menu_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can manage IVR)
CREATE POLICY "Allow authenticated read ivr_menus_v2" ON ivr_menus_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write ivr_menus_v2" ON ivr_menus_v2
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read ivr_menu_options" ON ivr_menu_options
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write ivr_menu_options" ON ivr_menu_options
  FOR ALL TO authenticated USING (true);

-- Allow anon read for Edge Functions
CREATE POLICY "Allow anon read ivr_menus_v2" ON ivr_menus_v2
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read ivr_menu_options" ON ivr_menu_options
  FOR SELECT TO anon USING (true);
