-- UPDATE the after_name audio recording
-- Replace 'YOUR_NEW_AUDIO_URL_HERE' with the URL of your new uploaded recording

UPDATE call_audio_config
SET 
  after_name_audio_url = 'YOUR_NEW_AUDIO_URL_HERE',
  use_after_name_audio = true,
  updated_at = NOW()
WHERE is_active = true;

-- Verify the update
SELECT audio_name, audio_url, is_enabled 
FROM (
  SELECT 
    'after_name' as audio_name,
    after_name_audio_url as audio_url,
    use_after_name_audio as is_enabled
  FROM call_audio_config WHERE is_active = true
) x;

-- STEPS TO UPDATE:
-- 1. Go to Supabase Storage
-- 2. Upload your new audio file to: voicemail-recordings/call-audio/weekly_availability/
-- 3. Get the public URL
-- 4. Replace 'YOUR_NEW_AUDIO_URL_HERE' above with that URL
-- 5. Run this query
