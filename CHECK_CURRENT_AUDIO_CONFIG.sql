-- Check what audio files are currently configured in database
SELECT 
  id,
  is_active,
  use_greeting_audio,
  greeting_audio_url,
  use_menu_options_audio,
  menu_options_audio_url,
  use_before_name_audio,
  before_name_audio_url,
  use_after_name_audio,
  after_name_audio_url,
  use_beds_question_audio,
  beds_question_audio_url,
  use_accept_confirmation_audio,
  accept_confirmation_audio_url,
  use_decline_audio,
  decline_audio_url,
  use_friday_callback_audio,
  friday_callback_audio_url,
  created_at,
  updated_at
FROM call_audio_config
ORDER BY is_active DESC, updated_at DESC;
