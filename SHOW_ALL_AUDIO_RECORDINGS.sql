-- Show ALL audio recordings currently configured
-- This will help you see which recordings are being used and which need to be updated

SELECT * FROM (
  SELECT 
    'greeting' as audio_name,
    greeting_audio_url as audio_url,
    use_greeting_audio as is_enabled,
    greeting_text as fallback_text,
    1 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'menu_options' as audio_name,
    menu_options_audio_url as audio_url,
    use_menu_options_audio as is_enabled,
    menu_options_text as fallback_text,
    2 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'before_name' as audio_name,
    before_name_audio_url as audio_url,
    use_before_name_audio as is_enabled,
    before_name_text as fallback_text,
    3 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'after_name' as audio_name,
    after_name_audio_url as audio_url,
    use_after_name_audio as is_enabled,
    after_name_text as fallback_text,
    4 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'beds_question' as audio_name,
    beds_question_audio_url as audio_url,
    use_beds_question_audio as is_enabled,
    beds_question_text as fallback_text,
    5 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'accept_confirmation' as audio_name,
    accept_confirmation_audio_url as audio_url,
    use_accept_confirmation_audio as is_enabled,
    accept_confirmation_text as fallback_text,
    6 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'decline' as audio_name,
    decline_audio_url as audio_url,
    use_decline_audio as is_enabled,
    decline_text as fallback_text,
    7 as sort_order
  FROM call_audio_config WHERE is_active = true

  UNION ALL

  SELECT 
    'friday_callback' as audio_name,
    friday_callback_audio_url as audio_url,
    use_friday_callback_audio as is_enabled,
    friday_callback_text as fallback_text,
    8 as sort_order
  FROM call_audio_config WHERE is_active = true
) audio_list
ORDER BY sort_order;
