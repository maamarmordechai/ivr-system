-- ===================================================================
-- REVERT TO ENGLISH - Twilio doesn't support Hebrew TTS
-- ===================================================================

-- Change language setting back to English
UPDATE system_settings 
SET setting_value = 'en-US'
WHERE setting_key = 'tts_language';

-- Revert main IVR menu to English
UPDATE ivr_menus_v2 
SET prompt_text = 'Welcome to our accommodation service. Press 1 for guest services. Press 2 for host registration. Press 3 for urgent matters. Press 0 for main office'
WHERE menu_key = 'main';

-- Revert bed audio to English
UPDATE bed_audio_settings SET default_text = 'Hello, welcome back' WHERE audio_key = 'existing_host_greeting';
UPDATE bed_audio_settings SET default_text = 'Our records show you have {bed_count} beds available' WHERE audio_key = 'existing_host_beds_info';
UPDATE bed_audio_settings SET default_text = 'We are looking for beds this week' WHERE audio_key = 'beds_needed_prompt';
UPDATE bed_audio_settings SET default_text = 'Press 1 to confirm all your beds are available this week. Press 2 to update the number of available beds' WHERE audio_key = 'existing_host_prompt';
UPDATE bed_audio_settings SET default_text = 'Welcome to the hosting system' WHERE audio_key = 'welcome_message';
UPDATE bed_audio_settings SET default_text = 'How many beds can you provide? Enter a number now' WHERE audio_key = 'new_host_prompt';
UPDATE bed_audio_settings SET default_text = 'Thank you very much. We appreciate your help' WHERE audio_key = 'thank_you_message';
UPDATE bed_audio_settings SET default_text = 'How many beds can you provide this week? Enter a number now' WHERE audio_key = 'partial_beds_prompt';
UPDATE bed_audio_settings SET default_text = 'Okay, we will call you Friday if we still need beds. Thank you' WHERE audio_key = 'callback_friday_confirm';
UPDATE bed_audio_settings SET default_text = 'Please record your name after the beep so we can contact you' WHERE audio_key = 'name_recording_prompt';
UPDATE bed_audio_settings SET default_text = 'Would you like to receive weekly calls? Press 1 for yes, press 2 for no' WHERE audio_key = 'weekly_calls_question';

-- Revert meal audio to English
UPDATE meal_audio_settings SET default_text = 'Hello, this is the weekly confirmation call for hosting meals' WHERE audio_key = 'intro';
UPDATE meal_audio_settings SET default_text = 'We are looking for hosts for guests this coming Shabbat. How many guests can you host? Press 0 if you cannot host this week' WHERE audio_key = 'guest_count_prompt';
UPDATE meal_audio_settings SET default_text = 'Which meals can you provide? Press 1 for Friday night meal only, press 2 for Saturday day meal only, or press 3 for both meals' WHERE audio_key = 'meal_selection';
UPDATE meal_audio_settings SET default_text = 'Thank you for hosting the Saturday day meal' WHERE audio_key = 'day_meal_only';
UPDATE meal_audio_settings SET default_text = 'Thank you for hosting the Friday night meal' WHERE audio_key = 'night_meal_only';
UPDATE meal_audio_settings SET default_text = 'Thank you for hosting both Friday night and Saturday day meals' WHERE audio_key = 'both_meals';
UPDATE meal_audio_settings SET default_text = 'Your confirmation has been recorded. Thank you and Shabbat Shalom' WHERE audio_key = 'thank_you';

-- Verify changes
SELECT 'Language Setting' as category, setting_key, setting_value FROM system_settings WHERE setting_key = 'tts_language'
UNION ALL
SELECT 'IVR Menu' as category, menu_key, prompt_text FROM ivr_menus_v2 WHERE menu_key = 'main';
