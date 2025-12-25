-- Check the actual structure of bed_audio_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bed_audio_settings'
ORDER BY ordinal_position;

-- Check the actual structure of meal_audio_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'meal_audio_settings'
ORDER BY ordinal_position;

-- View current data
SELECT * FROM bed_audio_settings LIMIT 5;
SELECT * FROM meal_audio_settings LIMIT 5;
