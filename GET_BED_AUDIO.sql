-- Query to see current bed audio settings
SELECT audio_key, default_text 
FROM bed_audio_settings 
WHERE is_active = true
ORDER BY audio_key;
