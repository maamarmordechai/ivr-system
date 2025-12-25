-- FIX COLUMN NAMES IN call_audio_config
-- The code expects use_X_audio but database has X_use_audio
-- Run this in Supabase SQL Editor

-- Add the correctly named columns
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_greeting_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_before_name_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_after_name_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_recognized_host_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_unrecognized_host_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_menu_options_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_beds_question_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_accept_confirmation_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_goodbye_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_decline_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_friday_callback_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_guest_info_audio BOOLEAN DEFAULT false;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_no_beds_needed_audio BOOLEAN DEFAULT false;

-- Copy values from old columns if they exist
UPDATE call_audio_config SET 
  use_greeting_audio = COALESCE(greeting_use_audio, false),
  use_before_name_audio = COALESCE(before_name_use_audio, false),
  use_after_name_audio = COALESCE(after_name_use_audio, false),
  use_recognized_host_audio = COALESCE(recognized_host_use_audio, false),
  use_unrecognized_host_audio = COALESCE(unrecognized_host_use_audio, false),
  use_menu_options_audio = COALESCE(menu_options_use_audio, false),
  use_beds_question_audio = COALESCE(beds_question_use_audio, false),
  use_accept_confirmation_audio = COALESCE(accept_confirmation_use_audio, false),
  use_goodbye_audio = COALESCE(goodbye_use_audio, false),
  use_decline_audio = COALESCE(decline_use_audio, false),
  use_friday_callback_audio = COALESCE(friday_callback_use_audio, false),
  use_guest_info_audio = COALESCE(guest_info_use_audio, false),
  use_no_beds_needed_audio = COALESCE(no_beds_needed_use_audio, false);

-- Drop old columns (optional - can keep for compatibility)
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS greeting_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS before_name_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS after_name_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS recognized_host_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS unrecognized_host_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS menu_options_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS beds_question_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS accept_confirmation_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS goodbye_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS decline_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS friday_callback_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS guest_info_use_audio;
ALTER TABLE call_audio_config DROP COLUMN IF EXISTS no_beds_needed_use_audio;

-- Verify the columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'call_audio_config' ORDER BY column_name;
