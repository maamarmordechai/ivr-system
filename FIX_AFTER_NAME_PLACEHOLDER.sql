-- FIX: Revert after_name audio to original MP3 (or disable it)
-- The placeholder 'YOUR_NEW_AUDIO_URL_HERE' was accidentally saved to database

-- Option 1: Revert to original MP3 URL
UPDATE call_audio_config
SET 
  after_name_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/after_name_1766081797115.mp3',
  use_after_name_audio = true,
  updated_at = NOW()
WHERE is_active = true;

-- Option 2: Disable after_name audio entirely (comment out Option 1 and use this instead)
-- UPDATE call_audio_config
-- SET 
--   use_after_name_audio = false,
--   updated_at = NOW()
-- WHERE is_active = true;

-- Verify the fix
SELECT 
  'after_name' as audio_name,
  after_name_audio_url as audio_url,
  use_after_name_audio as is_enabled
FROM call_audio_config 
WHERE is_active = true;
