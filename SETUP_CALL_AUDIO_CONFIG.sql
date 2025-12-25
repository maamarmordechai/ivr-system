-- ============================================
-- CALL AUDIO CONFIGURATION SETUP
-- ============================================
-- This script sets up the call audio configuration system
-- that allows admins to select which recordings play at 
-- each position in the call flow

-- Run the migration file:
-- supabase/migrations/20241218_add_call_audio_config.sql

-- Or run this SQL directly in the Supabase SQL Editor:

-- Drop if exists for clean rebuild
DROP TABLE IF EXISTS call_audio_config CASCADE;

-- Main configuration table for call audio positions
CREATE TABLE call_audio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Opening/Greeting audio
  greeting_audio_url TEXT,
  greeting_text TEXT DEFAULT 'Welcome to the system.',
  use_greeting_audio BOOLEAN DEFAULT false,
  
  -- Before saying the person's name
  before_name_audio_url TEXT,
  before_name_text TEXT DEFAULT 'Thank you',
  use_before_name_audio BOOLEAN DEFAULT false,
  
  -- After saying the person's name  
  after_name_audio_url TEXT,
  after_name_text TEXT,
  use_after_name_audio BOOLEAN DEFAULT false,
  
  -- When asking how many beds
  beds_question_audio_url TEXT,
  beds_question_text TEXT DEFAULT 'How many beds can you offer? Enter the number and press pound.',
  use_beds_question_audio BOOLEAN DEFAULT false,
  
  -- When guest accepts/confirms
  accept_confirmation_audio_url TEXT,
  accept_confirmation_text TEXT DEFAULT 'Thank you for confirming.',
  use_accept_confirmation_audio BOOLEAN DEFAULT false,
  
  -- After guest accepts - before hanging up
  goodbye_audio_url TEXT,
  goodbye_text TEXT DEFAULT 'We will call you back if needed. Goodbye.',
  use_goodbye_audio BOOLEAN DEFAULT false,
  
  -- When guest declines
  decline_audio_url TEXT,
  decline_text TEXT DEFAULT 'Thank you for letting us know. Goodbye.',
  use_decline_audio BOOLEAN DEFAULT false,
  
  -- When requesting Friday callback
  friday_callback_audio_url TEXT,
  friday_callback_text TEXT DEFAULT 'We will call you back on Friday. Goodbye.',
  use_friday_callback_audio BOOLEAN DEFAULT false,
  
  -- Menu options audio
  menu_options_audio_url TEXT,
  menu_options_text TEXT DEFAULT 'Press 1 if available, press 2 if not available, press 3 to be called back on Friday.',
  use_menu_options_audio BOOLEAN DEFAULT false,
  
  -- When recognized host is found
  recognized_host_audio_url TEXT,
  recognized_host_text TEXT DEFAULT 'Our records show you as',
  use_recognized_host_audio BOOLEAN DEFAULT false,
  
  -- When host is not in system
  unrecognized_host_audio_url TEXT,
  unrecognized_host_text TEXT DEFAULT 'We do not recognize your number.',
  use_unrecognized_host_audio BOOLEAN DEFAULT false,
  
  -- Guest count info
  guest_info_audio_url TEXT,
  guest_info_text TEXT,
  use_guest_info_audio BOOLEAN DEFAULT false,
  
  -- No beds needed message
  no_beds_needed_audio_url TEXT,
  no_beds_needed_text TEXT DEFAULT 'Thank you for calling, everyone is already set for this week. Have a good Shabbos.',
  use_no_beds_needed_audio BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO call_audio_config (
  config_name, 
  description,
  greeting_text,
  before_name_text,
  beds_question_text,
  accept_confirmation_text,
  goodbye_text,
  decline_text,
  friday_callback_text,
  menu_options_text,
  recognized_host_text,
  unrecognized_host_text
) VALUES 
(
  'weekly_availability',
  'Audio configuration for weekly host availability calls',
  'Welcome to the Machnisei Orchim phone line.',
  'Thank you',
  'How many beds can you offer this Shabbos? Enter the number and press pound.',
  'Thank you for your generosity.',
  'We will call you back to confirm a guest according to your convenience. Goodbye.',
  'Thank you for letting us know. Goodbye.',
  'We will call you back on Friday. Goodbye.',
  'To confirm you can host guests this Shabbos, press 1. If not available, press 2. To be called back on Friday, press 3.',
  'The system recognizes you as',
  'The system does not recognize your number.'
),
(
  'guest_assignment',
  'Audio configuration for guest assignment calls',
  'Hello, this is a call from Accommodation Management.',
  'We have found a match for',
  'How many beds are you offering?',
  'Great! Your guest will arrive shortly.',
  'Thank you for hosting. Have a good Shabbos.',
  'We will find another host. Thank you.',
  'We will contact you on Friday with guest details.',
  'Press 1 to accept the guest, press 2 to decline.',
  'According to our records, you are',
  'We do not have you in our system.'
),
(
  'meal_host',
  'Audio configuration for meal hosting calls',
  'Welcome to the Shabbat meals coordination line.',
  'Thank you',
  'How many guests can you host for meals?',
  'Thank you for hosting meals.',
  'We will send guest details. Goodbye.',
  'Thank you for letting us know. Goodbye.',
  'We will call you Friday to confirm meal plans.',
  'Press 1 for night meal only, press 2 for day meal only, press 3 for both meals.',
  'We have you registered as',
  'Please provide your details.'
);

-- Indexes
CREATE INDEX idx_call_audio_config_name ON call_audio_config(config_name);
CREATE INDEX idx_call_audio_config_active ON call_audio_config(is_active);

-- RLS
ALTER TABLE call_audio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage call_audio_config" ON call_audio_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can read call_audio_config" ON call_audio_config
  FOR SELECT TO anon USING (true);

-- ============================================
-- HOW TO USE
-- ============================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Go to Settings > Call Audio in the app
-- 3. Select a call scenario (weekly_availability, guest_assignment, or meal_host)
-- 4. For each audio position:
--    - Toggle "Use Audio" to enable custom audio
--    - Upload an MP3 file OR edit the text for TTS fallback
--    - The system will use your audio file if uploaded, otherwise TTS
-- 5. Click "Save Configuration"

-- ============================================
-- AUDIO POSITIONS EXPLAINED
-- ============================================
-- greeting: First thing played when caxxxxxxxxcts
-- before_name: Played before saying the person's name (e.g., "Thank you")
-- after_name: Played after saying the person's name (optional)
-- recognized_host: When system finds caller in database
-- unrecognized_host: When caller is not registered
-- menu_options: The "Press 1 for... Press 2 for..." options
-- beds_question: Asking how many beds they can offer
-- accept_confirmation: When host confirms/accepts
-- goodbye: Final message before hanging up (after accepting)
-- decline: When host says they're not available
-- friday_callback: When host wants to be called back Friday
-- guest_info: "We have X guests waiting"
-- no_beds_needed: "Everyone is set for this week"
