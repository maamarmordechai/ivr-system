-- Add setting for number language (always English)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('tts_number_language', 'en-US', 'Language for number pronunciation (en-US for English numbers)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Note: To make numbers speak in English while using Hebrew voice:
-- Option 1: Use language="en-US" attribute temporarily when saying numbers
-- Option 2: Spell out numbers in Hebrew text ("שלושים" instead of "30")
-- Option 3: Use <lang xml:lang="en-US">30</lang> tags around numbers

-- For now, the easiest is to spell numbers in Hebrew text in your IVR prompts
-- Example: Instead of "We need 30 beds", write "אנחנו צריכים שלושים מיטות"
