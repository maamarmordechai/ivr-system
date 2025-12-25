-- Add language setting to system_settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('tts_language', 'he-IL', 'Text-to-speech language code (he-IL for Hebrew, en-US for English)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

COMMENT ON TABLE system_settings IS 'System-wide configuration settings including TTS language';
