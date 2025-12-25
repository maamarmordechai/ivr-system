-- Create bed audio settings table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bed_audio_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_key TEXT NOT NULL UNIQUE,
  audio_url TEXT,
  default_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default audio settings
INSERT INTO bed_audio_settings (audio_key, default_text) VALUES
  ('welcome_message', 'Welcome to the accommodation system.'),
  ('beds_needed_prompt', 'We are looking for {beds_remaining} beds this week.'),
  ('existing_host_greeting', 'Hello, welcome back.'),
  ('existing_host_beds_info', 'Our records show you have {bed_count} beds available.'),
  ('existing_host_prompt', 'Are you available to provide beds this week? Press 1 for yes, all beds available. Press 2 for no, not available. Press 3 for only some beds available. Press 9 to call me back on Friday.'),
  ('partial_beds_prompt', 'How many beds can you provide this week? Enter a number now.'),
  ('callback_friday_confirm', 'OK, we will call you back on Friday if we still need beds. Thank you.'),
  ('new_host_prompt', 'How many beds can you provide? Enter a number now.'),
  ('thank_you_message', 'Thank you. We appreciate your help.'),
  ('name_recording_prompt', 'Please record your name after the beep so we can contact you.'),
  ('weekly_calls_question', 'Would you like to receive weekly calls? Press 1 for yes, press 2 for no.')
ON CONFLICT (audio_key) DO NOTHING;

-- Enable RLS
ALTER TABLE bed_audio_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read bed audio settings" ON bed_audio_settings;
CREATE POLICY "Allow authenticated users to read bed audio settings" 
  ON bed_audio_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update bed audio settings" ON bed_audio_settings;
CREATE POLICY "Allow authenticated users to update bed audio settings" 
  ON bed_audio_settings FOR UPDATE TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bed_audio_key ON bed_audio_settings(audio_key);
CREATE INDEX IF NOT EXISTS idx_bed_audio_active ON bed_audio_settings(is_active);
