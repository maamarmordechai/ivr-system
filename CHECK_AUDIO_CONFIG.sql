-- CHECK CALL AUDIO CONFIG STATUS
-- Run this in Supabase SQL Editor to see what's configured

-- 1. See all records and their key settings
SELECT 
  id,
  config_name,
  is_active,
  -- Greeting
  greeting_audio_url IS NOT NULL as has_greeting_audio,
  use_greeting_audio,
  -- Accept confirmation  
  accept_confirmation_audio_url IS NOT NULL as has_accept_audio,
  use_accept_confirmation_audio,
  -- Goodbye
  goodbye_audio_url IS NOT NULL as has_goodbye_audio,
  use_goodbye_audio
FROM call_audio_config;

-- 2. Show all audio URLs that are set (not null)
SELECT 
  'greeting' as position, greeting_audio_url as url, use_greeting_audio as enabled FROM call_audio_config WHERE greeting_audio_url IS NOT NULL
UNION ALL
SELECT 
  'before_name', before_name_audio_url, use_before_name_audio FROM call_audio_config WHERE before_name_audio_url IS NOT NULL
UNION ALL
SELECT 
  'after_name', after_name_audio_url, use_after_name_audio FROM call_audio_config WHERE after_name_audio_url IS NOT NULL
UNION ALL
SELECT 
  'recognized_host', recognized_host_audio_url, use_recognized_host_audio FROM call_audio_config WHERE recognized_host_audio_url IS NOT NULL
UNION ALL
SELECT 
  'menu_options', menu_options_audio_url, use_menu_options_audio FROM call_audio_config WHERE menu_options_audio_url IS NOT NULL
UNION ALL
SELECT 
  'beds_question', beds_question_audio_url, use_beds_question_audio FROM call_audio_config WHERE beds_question_audio_url IS NOT NULL
UNION ALL
SELECT 
  'accept_confirmation', accept_confirmation_audio_url, use_accept_confirmation_audio FROM call_audio_config WHERE accept_confirmation_audio_url IS NOT NULL
UNION ALL
SELECT 
  'goodbye', goodbye_audio_url, use_goodbye_audio FROM call_audio_config WHERE goodbye_audio_url IS NOT NULL
UNION ALL
SELECT 
  'decline', decline_audio_url, use_decline_audio FROM call_audio_config WHERE decline_audio_url IS NOT NULL;

-- 3. Check weekly_bed_tracking for current week
SELECT 
  w.id as week_id,
  w.week_start_date,
  w.week_end_date,
  bt.beds_needed,
  bt.beds_confirmed,
  bt.beds_needed - bt.beds_confirmed as beds_still_needed
FROM desperate_weeks w
LEFT JOIN weekly_bed_tracking bt ON w.id = bt.week_id
WHERE CURRENT_DATE BETWEEN w.week_start_date AND w.week_end_date;

-- 4. If beds_confirmed is not updating, check if the increment_beds_confirmed function exists
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name = 'increment_beds_confirmed';
