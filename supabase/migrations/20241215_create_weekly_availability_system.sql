-- Weekly Availability Check System
-- Tracks responses when hosts are asked about availability

-- Table for tracking weekly availability responses
CREATE TABLE IF NOT EXISTS weekly_availability_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES desperate_weeks(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  response_type TEXT NOT NULL CHECK (response_type IN ('yes', 'no', 'friday_callback')),
  beds_offered INTEGER, -- Only filled if response_type = 'yes'
  call_sid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_weekly_availability_week ON weekly_availability_calls(week_id);
CREATE INDEX IF NOT EXISTS idx_weekly_availability_apartment ON weekly_availability_calls(apartment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_availability_response ON weekly_availability_calls(response_type);

COMMENT ON TABLE weekly_availability_calls IS 'Tracks host responses to weekly availability calls';
COMMENT ON COLUMN weekly_availability_calls.response_type IS 'yes=available, no=not available, friday_callback=call back on Friday';

-- Table for storing audio prompt URLs
CREATE TABLE IF NOT EXISTS audio_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT UNIQUE NOT NULL,
  prompt_name TEXT NOT NULL,
  audio_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_prompts_key ON audio_prompts(prompt_key);

COMMENT ON TABLE audio_prompts IS 'MP3 file URLs for weekly availability check system';

-- Insert default audio prompts (URLs to be filled in later)
INSERT INTO audio_prompts (prompt_key, prompt_name, description) VALUES
('availability_question', 'Availability Question', 'Main question: Are you available this week? Press 1 for yes, 2 for no, 3 for Friday callback'),
('thank_you_mr', 'Thank You Mr/Mrs Prefix', 'Thank you Mr/Mrs (before saying name)'),
('beds_question', 'Beds Question', 'How many beds do you have available?'),
('thank_you_yes', 'Thank You - Accepted Guests', 'Thank you message after accepting guests and entering bed count'),
('thank_you_no', 'Thank You - Not Available', 'Thank you message when host is not available'),
('thank_you_friday', 'Thank You - Call Friday', 'Thank you message when asking to be called back on Friday')
ON CONFLICT (prompt_key) DO NOTHING;

-- Add system setting to enable weekly availability mode
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('enable_weekly_availability_mode', 'false', 'When true, all incoming calls go through weekly availability check first')
ON CONFLICT (setting_key) DO UPDATE SET description = EXCLUDED.description;

-- Enable RLS
ALTER TABLE weekly_availability_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read weekly availability calls"
  ON weekly_availability_calls FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage weekly availability calls"
  ON weekly_availability_calls FOR ALL TO service_role USING (true);

CREATE POLICY "Allow authenticated users to read audio prompts"
  ON audio_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update audio prompts"
  ON audio_prompts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow service role to manage audio prompts"
  ON audio_prompts FOR ALL TO service_role USING (true);
