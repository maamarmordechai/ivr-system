-- Check what columns exist in call_audio_config
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_audio_config'
ORDER BY ordinal_position;

-- Check what audio is already configured
SELECT * FROM call_audio_config LIMIT 1;
