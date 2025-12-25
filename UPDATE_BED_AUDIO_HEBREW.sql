-- UPDATE BED AUDIO SETTINGS TO HEBREW
-- Run this in Supabase SQL Editor to convert bed system to Hebrew

UPDATE bed_audio_settings 
SET default_text = 'שלום, ברוך שובך'
WHERE audio_key = 'existing_host_greeting';

UPDATE bed_audio_settings 
SET default_text = 'הרשומות שלנו מראות שיש לך {bed_count} מיטות זמינות'
WHERE audio_key = 'existing_host_beds_info';

UPDATE bed_audio_settings 
SET default_text = 'אנחנו מחפשים {beds_remaining} מיטות השבוע'
WHERE audio_key = 'beds_needed_prompt';

UPDATE bed_audio_settings 
SET default_text = 'האם אתה זמין לספק מיטות השבוע? לחץ 1 לכן, כל המיטות זמינות. לחץ 2 לא, לא זמין. לחץ 3 רק חלק מהמיטות זמינות. לחץ 9 כדי שנתקשר אליך ביום שישי'
WHERE audio_key = 'existing_host_prompt';

UPDATE bed_audio_settings 
SET default_text = 'ברוכים הבאים למערכת האירוח'
WHERE audio_key = 'welcome_message';

UPDATE bed_audio_settings 
SET default_text = 'כמה מיטות אתה יכול לספק? הזן מספר עכשיו'
WHERE audio_key = 'new_host_prompt';

UPDATE bed_audio_settings 
SET default_text = 'תודה רבה. נעריך את העזרה שלך'
WHERE audio_key = 'thank_you_message';

UPDATE bed_audio_settings 
SET default_text = 'כמה מיטות זמינות לך? הזן את המספר'
WHERE audio_key = 'partial_beds_prompt';

UPDATE bed_audio_settings 
SET default_text = 'אין בעיה. נתקשר אליך ביום שישי בבוקר. שבוע טוב'
WHERE audio_key = 'callback_friday_confirm';

-- Verify the updates
SELECT audio_key, default_text 
FROM bed_audio_settings 
WHERE is_active = true
ORDER BY audio_key;
