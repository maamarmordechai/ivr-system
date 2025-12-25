-- Run this in Supabase SQL Editor to enable Hebrew TTS
-- Dashboard: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/sql

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('tts_language', 'he-IL', 'Text-to-speech language code (he-IL for Hebrew, en-US for English)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Verify the setting was added
SELECT * FROM system_settings WHERE setting_key = 'tts_language';
