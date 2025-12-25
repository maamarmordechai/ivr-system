-- Create table for IVR menu greeting audio files
-- Each menu can have a custom greeting that plays before the options

CREATE TABLE IF NOT EXISTS ivr_menu_greetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_name TEXT NOT NULL UNIQUE,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_menu_greetings_lookup 
ON ivr_menu_greetings(menu_name);

-- Example: Add greeting for main menu
INSERT INTO ivr_menu_greetings (menu_name, audio_url)
VALUES ('main_menu', 'https://your-storage-url.com/main-menu-greeting.wav')
ON CONFLICT (menu_name) DO NOTHING;

-- View current greetings
SELECT 
  menu_name,
  audio_url,
  updated_at
FROM ivr_menu_greetings
ORDER BY menu_name;
