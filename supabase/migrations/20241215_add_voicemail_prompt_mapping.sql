-- Create table to map audio prompts to voicemail recordings
-- This allows easy changing of which voicemail is used for each prompt

CREATE TABLE IF NOT EXISTS voicemail_audio_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT UNIQUE NOT NULL,
  prompt_name TEXT NOT NULL,
  voicemail_id UUID REFERENCES voicemails(id) ON DELETE SET NULL,
  audio_url TEXT, -- Direct MP3 URL (alternative to voicemail)
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voicemail_audio_prompts_key ON voicemail_audio_prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_voicemail_audio_prompts_voicemail ON voicemail_audio_prompts(voicemail_id);

COMMENT ON TABLE voicemail_audio_prompts IS 'Maps audio prompts to voicemail recordings for weekly availability system';

-- Insert initial mappings with your specified voicemail IDs
INSERT INTO voicemail_audio_prompts (prompt_key, prompt_name, voicemail_id, description) VALUES
('availability_question', 'Availability Question', '220c4066-bd17-4e8c-9d0c-0125a5b34de6', 'Main question: Are you available this week?'),
('thank_you_mr', 'Thank You Mr/Mrs Prefix', '373f818c-eb0a-42fd-b361-f7268005fca3', 'Thank you Mr/Mrs (before saying name)'),
('beds_question', 'Beds Question', '5ec0ac93-c784-458c-874e-65aab6e8a400', 'How many beds do you have available?'),
('thank_you_yes', 'Thank You - Accepted Guests', '373f818c-eb0a-42fd-b361-f7268005fca3', 'Thank you message after accepting guests'),
('thank_you_no', 'Thank You - Not Available', '373f818c-eb0a-42fd-b361-f7268005fca3', 'Thank you message when not available'),
('thank_you_friday', 'Thank You - Call Friday', '373f818c-eb0a-42fd-b361-f7268005fca3', 'Thank you message for Friday callback')
ON CONFLICT (prompt_key) DO UPDATE SET 
  voicemail_id = EXCLUDED.voicemail_id,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE voicemail_audio_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read voicemail audio prompts"
  ON voicemail_audio_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update voicemail audio prompts"
  ON voicemail_audio_prompts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow service role to manage voicemail audio prompts"
  ON voicemail_audio_prompts FOR ALL TO service_role USING (true);
