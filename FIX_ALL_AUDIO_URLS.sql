-- Fix ALL audio URLs to use correct current files
-- This removes any placeholder values and sets proper URLs

UPDATE call_audio_config
SET 
  -- Step 1: Greeting (WAV - working)
  greeting_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/greeting_1766081720758.wav',
  use_greeting_audio = true,
  
  -- Step 2: Menu Options (WAV - working)
  menu_options_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/menu_options_1766081810643.wav',
  use_menu_options_audio = true,
  
  -- Step 3: Before Name (WAV - working)
  before_name_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/before_name_1766081786179.wav',
  use_before_name_audio = true,
  
  -- Step 4: After Name (MP3 - screechy but functional)
  after_name_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/after_name_1766081797115.mp3',
  use_after_name_audio = true,
  
  -- Step 5: Beds Question (MP3 - screechy but functional)
  beds_question_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/beds_question_1766081820440.mp3',
  use_beds_question_audio = true,
  
  -- Step 6: Accept Confirmation (MP3 - screechy but functional)
  accept_confirmation_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/accept_confirmation_1766081832192.mp3',
  use_accept_confirmation_audio = true,
  
  -- Step 7: Decline (MP3 - screechy but functional)
  decline_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/decline_1766081846202.mp3',
  use_decline_audio = true,
  
  -- Step 8: Friday Callback (WAV - working)
  friday_callback_audio_url = 'https://wwopmopxgpdeqxuacagf.supabase.co/storage/v1/object/public/voicemail-recordings/call-audio/weekly_availability/friday_callback_1766081855757.wav',
  use_friday_callback_audio = true,
  
  updated_at = NOW()
WHERE is_active = true;

-- Verify all URLs are correct
SELECT 
  'greeting' as step, greeting_audio_url as url, use_greeting_audio as enabled
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'menu_options', menu_options_audio_url, use_menu_options_audio
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'before_name', before_name_audio_url, use_before_name_audio
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'after_name', after_name_audio_url, use_after_name_audio
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'beds_question', beds_question_audio_url, use_beds_question_audio
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'accept_confirmation', accept_confirmation_audio_url, use_accept_confirmation_audio
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'decline', decline_audio_url, use_decline_audio
FROM call_audio_config WHERE is_active = true
UNION ALL
SELECT 'friday_callback', friday_callback_audio_url, use_friday_callback_audio
FROM call_audio_config WHERE is_active = true
ORDER BY step;
