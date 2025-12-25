-- Add audio file support and voice gender selection to IVR menus

-- Add columns to ivr_menus_v2 for audio files and voice gender
ALTER TABLE ivr_menus_v2 
  ADD COLUMN IF NOT EXISTS use_audio_file BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_gender TEXT DEFAULT 'man' CHECK (voice_gender IN ('man', 'woman'));

-- Update voice_name to use male voice by default
UPDATE ivr_menus_v2 SET voice_name = 'man' WHERE voice_name = 'alice';

-- Add columns to ivr_menu_options for audio prompts
ALTER TABLE ivr_menu_options
  ADD COLUMN IF NOT EXISTS option_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS use_audio_file BOOLEAN DEFAULT false;

-- Comment on new columns
COMMENT ON COLUMN ivr_menus_v2.use_audio_file IS 'If true, use prompt_audio_url instead of text-to-speech';
COMMENT ON COLUMN ivr_menus_v2.voice_gender IS 'Preferred voice gender for text-to-speech: man or woman';
COMMENT ON COLUMN ivr_menu_options.option_audio_url IS 'URL to custom audio file for this option';
COMMENT ON COLUMN ivr_menu_options.use_audio_file IS 'If true, use option_audio_url instead of text-to-speech';
