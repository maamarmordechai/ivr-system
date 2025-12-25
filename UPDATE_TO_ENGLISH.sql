-- UPDATE CALL AUDIO CONFIG TO ENGLISH
-- Run this in Supabase SQL Editor

UPDATE call_audio_config SET
  greeting_text = 'Hello, this is the Machnisei Orchim hospitality system.',
  before_name_text = 'We are looking for beds for this Shabbos.',
  after_name_text = 'Can you host guests?',
  recognized_host_text = 'Hello, we recognize you from our system.',
  unrecognized_host_text = 'Hello, we do not recognize your phone number.',
  menu_options_text = 'Press 1 to accept guests. Press 2 to decline. Press 3 to request a callback on Friday.',
  beds_question_text = 'How many beds can you offer? Please enter the number.',
  accept_confirmation_text = 'Thank you very much! Your registration has been saved successfully.',
  goodbye_text = 'Goodbye!',
  decline_text = 'Thank you for letting us know. Goodbye.',
  friday_callback_text = 'You have been registered for a callback on Friday. Goodbye.',
  guest_info_text = 'Here are your guest details:',
  no_beds_needed_text = 'Thank you for your willingness to help! We already have enough beds for this week. We will call you again next week. Goodbye!',
  updated_at = NOW()
WHERE config_name = 'weekly_availability';

-- Verify
SELECT config_name, greeting_text, menu_options_text, no_beds_needed_text FROM call_audio_config;
