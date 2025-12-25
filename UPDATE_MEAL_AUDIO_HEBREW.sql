-- UPDATE MEAL AUDIO SETTINGS TO HEBREW
-- Run this in Supabase SQL Editor to convert meal system to Hebrew

UPDATE meal_audio_settings 
SET default_text = 'שלום, זו שיחת האישור השבועית לארוח ארוחות'
WHERE audio_key = 'intro';

UPDATE meal_audio_settings 
SET default_text = 'אנחנו מחפשים מארחים לאורחים בשבת הקרובה. כמה אורחים אתה יכול לארח? לחץ 0 אם אינך יכול לארח השבוע'
WHERE audio_key = 'guest_count_prompt';

UPDATE meal_audio_settings 
SET default_text = 'אילו ארוחות תוכל לספק? לחץ 1 רק לסעודת ליל שישי, לחץ 2 רק לסעודת יום שבת, או לחץ 3 לשתי הסעודות'
WHERE audio_key = 'meal_selection';

UPDATE meal_audio_settings 
SET default_text = 'תודה על אירוח סעודת יום שבת'
WHERE audio_key = 'day_meal_only';

UPDATE meal_audio_settings 
SET default_text = 'תודה על אירוח סעודת ליל שישי'
WHERE audio_key = 'night_meal_only';

UPDATE meal_audio_settings 
SET default_text = 'תודה על אירוח סעודת ליל שישי וסעודת יום שבת'
WHERE audio_key = 'both_meals';

UPDATE meal_audio_settings 
SET default_text = 'האישור שלך נרשם. תודה ושבת שלום'
WHERE audio_key = 'thank_you';

-- Verify the updates
SELECT audio_key, default_text 
FROM meal_audio_settings 
WHERE is_active = true
ORDER BY audio_key;
