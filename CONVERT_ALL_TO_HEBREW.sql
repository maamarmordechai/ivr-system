-- ===================================================================
-- COMPLETE HEBREW CONVERSION FOR IVR SYSTEM
-- Run this entire file in Supabase SQL Editor
-- ===================================================================

-- 1. UPDATE MEAL AUDIO SETTINGS TO HEBREW
UPDATE meal_audio_settings 
SET default_text = 'שלום, זו שיחת האישור השבועית לארוח ארוחות'
WHERE audio_key = 'intro';

UPDATE meal_audio_settings 
SET default_text = 'אנחנו מחפשים מארחים לאורחים בשבת הקרובה. כמה אורחים אתה יכול לארח? לחץ אפס אם אינך יכול לארח השבוע'
WHERE audio_key = 'guest_count_prompt';

UPDATE meal_audio_settings 
SET default_text = 'אילו ארוחות תוכל לספק? לחץ אחת רק לסעודת ליל שישי, לחץ שתיים רק לסעודת יום שבת, או לחץ שלוש לשתי הסעודות'
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

-- 2. UPDATE BED AUDIO SETTINGS TO HEBREW
UPDATE bed_audio_settings 
SET default_text = 'שלום, ברוך שובך'
WHERE audio_key = 'existing_host_greeting';

UPDATE bed_audio_settings 
SET default_text = 'הרשומות שלנו מראות שיש לך {bed_count} מיטות זמינות'
WHERE audio_key = 'existing_host_beds_info';

UPDATE bed_audio_settings 
SET default_text = 'אנחנו מחפשים מיטות השבוע'
WHERE audio_key = 'beds_needed_prompt';

UPDATE bed_audio_settings 
SET default_text = 'לחץ אחת לאשר שכל המיטות שלך זמינות השבוע. לחץ שתיים לעדכן את מספר המיטות הזמינות'
WHERE audio_key = 'existing_host_prompt';

UPDATE bed_audio_settings 
SET default_text = 'ברוכים הבאים למערכת האירוח'
WHERE audio_key = 'welcome_message';

UPDATE bed_audio_settings 
SET default_text = 'כמה מיטות אתה יכול לספק? הזן מספר עכשיו'
WHERE audio_key = 'new_host_prompt';

UPDATE bed_audio_settings 
SET default_text = 'תודה רבה. אנחנו מעריכים את העזרה שלך'
WHERE audio_key = 'thank_you_message';

UPDATE bed_audio_settings 
SET default_text = 'כמה מיטות אתה יכול לספק השבוע? הזן מספר עכשיו'
WHERE audio_key = 'partial_beds_prompt';

UPDATE bed_audio_settings 
SET default_text = 'בסדר, נתקשר אליך ביום שישי אם עדיין נצטרך מיטות. תודה'
WHERE audio_key = 'callback_friday_confirm';

UPDATE bed_audio_settings 
SET default_text = 'אנא הקלט את שמך אחרי הצפצוף כדי שנוכל ליצור איתך קשר'
WHERE audio_key = 'name_recording_prompt';

UPDATE bed_audio_settings 
SET default_text = 'האם תרצה לקבל שיחות שבועיות? לחץ אחת לכן, לחץ שתיים לא'
WHERE audio_key = 'weekly_calls_question';

-- 3. UPDATE MAIN IVR MENU TO HEBREW (with Hebrew words for numbers)
UPDATE ivr_menus_v2 
SET prompt_text = 'ברוכים הבאים לשירות האירוח שלנו. לחץ אחת לשירותי אורחים. לחץ שתיים לרישום מארח. לחץ שלוש לעניינים דחופים. לחץ אפס למשרד הראשי'
WHERE menu_key = 'main';

-- 4. VERIFY ALL UPDATES
SELECT 'Meal Audio Settings' as category, audio_key, default_text 
FROM meal_audio_settings 
WHERE is_active = true
UNION ALL
SELECT 'Bed Audio Settings' as category, audio_key, default_text 
FROM bed_audio_settings 
WHERE is_active = true
UNION ALL
SELECT 'IVR Menu' as category, menu_key, prompt_text 
FROM ivr_menus_v2 
WHERE menu_key = 'main'
ORDER BY category, audio_key;

-- 5. CONFIRM LANGUAGE SETTING
SELECT setting_key, setting_value, description 
FROM system_settings 
WHERE setting_key = 'tts_language';
