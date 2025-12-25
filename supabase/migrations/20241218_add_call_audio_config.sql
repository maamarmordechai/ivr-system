-- Call Audio Configuration System
-- Allows admins to select which recordings play at each position in the call flow

-- Drop if exists for clean rebuild
DROP TABLE IF EXISTS call_audio_config CASCADE;

-- Main configuration table for call audio positions
CREATE TABLE call_audio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL UNIQUE, -- e.g., 'weekly_availability', 'guest_assignment', 'meal_host'
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
  
  -- Menu options audio (press 1 for..., press 2 for...)
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
  
  -- Guest count info (We have X guests waiting)
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

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can manage call_audio_config" ON call_audio_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read for edge functions
CREATE POLICY "Public can read call_audio_config" ON call_audio_config
  FOR SELECT TO anon USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_call_audio_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER call_audio_config_updated_at
  BEFORE UPDATE ON call_audio_config
  FOR EACH ROW
  EXECUTE FUNCTION update_call_audio_config_timestamp();

-- Comments
COMMENT ON TABLE call_audio_config IS 'Configuration for audio prompts at each position in call flows';
COMMENT ON COLUMN call_audio_config.config_name IS 'Unique identifier for the call scenario (weekly_availability, guest_assignment, etc)';
COMMENT ON COLUMN call_audio_config.greeting_audio_url IS 'Audio file URL for the initial greeting';
COMMENT ON COLUMN call_audio_config.before_name_audio_url IS 'Audio played BEFORE saying the hosts name';
COMMENT ON COLUMN call_audio_config.after_name_audio_url IS 'Audio played AFTER saying the hosts name';
COMMENT ON COLUMN call_audio_config.accept_confirmation_audio_url IS 'Audio played when host accepts/confirms';
