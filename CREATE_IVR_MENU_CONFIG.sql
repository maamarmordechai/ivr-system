-- Create IVR menu configuration table
-- This allows dynamic routing of menu options to different functions

-- Drop existing table if structure is wrong
DROP TABLE IF EXISTS ivr_menu_options CASCADE;

CREATE TABLE ivr_menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_name TEXT NOT NULL DEFAULT 'main_menu',
  digit_press TEXT NOT NULL, -- '1', '2', '0', '8', etc.
  function_name TEXT NOT NULL, -- 'accept_guests', 'register_host', 'admin', 'voicemail', or another menu name for sub-menus
  parent_menu_id UUID, -- NULL for main menu, points to parent for sub-menus
  audio_url TEXT,
  audio_text TEXT,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_name, digit_press)
);

-- Insert default main menu configuration
INSERT INTO ivr_menu_options (menu_name, digit_press, function_name, audio_text, display_order, is_enabled)
VALUES
  ('main_menu', '1', 'accept_guests', 'To accept guests for this Shabbos, press 1.', 1, true),
  ('main_menu', '2', 'register_host', 'To register as a host, press 2.', 2, true),
  ('main_menu', '0', 'voicemail', 'To leave a message, press 0.', 3, true),
  ('main_menu', '8', 'admin', 'For admin options, press 8.', 4, true)
ON CONFLICT (menu_name, digit_press) DO UPDATE SET
  function_name = EXCLUDED.function_name,
  audio_text = EXCLUDED.audio_text,
  display_order = EXCLUDED.display_order;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ivr_menu_lookup 
ON ivr_menu_options(menu_name, digit_press) 
WHERE is_enabled = true;

-- View current menu configuration
SELECT 
  digit_press,
  function_name,
  audio_text,
  is_enabled,
  display_order
FROM ivr_menu_options
WHERE menu_name = 'main_menu'
ORDER BY display_order;
