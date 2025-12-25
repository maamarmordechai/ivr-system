-- CREATE CALL QUEUE TABLE FOR SEQUENTIAL CALLING
-- Run this in Supabase SQL Editor

-- Drop existing table if it exists
DROP TABLE IF EXISTS call_queue;

-- Create call queue table for tracking sequential calls
CREATE TABLE call_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES desperate_weeks(id),
  apartment_id UUID REFERENCES apartments(id),
  host_name TEXT,
  phone_number TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'in_progress', 'completed', 'failed', 'skipped')),
  call_sid TEXT,
  call_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  beds_offered INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_call_queue_week ON call_queue(week_id);
CREATE INDEX idx_call_queue_status ON call_queue(status);
CREATE INDEX idx_call_queue_priority ON call_queue(week_id, priority);

-- Enable RLS
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (admin table)
CREATE POLICY "Allow all operations on call_queue" ON call_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Also run the call_audio_config migration if not already done
-- (This was created earlier for selecting which recordings to play)

DROP TABLE IF EXISTS call_audio_config;

CREATE TABLE call_audio_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT DEFAULT 'default',
  is_active BOOLEAN DEFAULT true,
  
  -- Greeting audio
  greeting_audio_url TEXT,
  greeting_text TEXT DEFAULT 'שלום, זו מערכת האירוח האוטומטית.',
  greeting_use_audio BOOLEAN DEFAULT false,
  
  -- Before saying name
  before_name_audio_url TEXT,
  before_name_text TEXT DEFAULT 'אנחנו מחפשים מיטות לשבת הקרובה.',
  before_name_use_audio BOOLEAN DEFAULT false,
  
  -- After saying name
  after_name_audio_url TEXT,
  after_name_text TEXT DEFAULT 'האם תוכל לארח?',
  after_name_use_audio BOOLEAN DEFAULT false,
  
  -- Recognized host greeting
  recognized_host_audio_url TEXT,
  recognized_host_text TEXT DEFAULT 'שלום, אנחנו מכירים אותך מהמערכת.',
  recognized_host_use_audio BOOLEAN DEFAULT false,
  
  -- Unrecognized host greeting
  unrecognized_host_audio_url TEXT,
  unrecognized_host_text TEXT DEFAULT 'שלום, אנחנו לא מזהים את המספר שלך.',
  unrecognized_host_use_audio BOOLEAN DEFAULT false,
  
  -- Menu options
  menu_options_audio_url TEXT,
  menu_options_text TEXT DEFAULT 'לחץ 1 להסכים, לחץ 2 לסרב, לחץ 3 לשיחה חוזרת ביום שישי.',
  menu_options_use_audio BOOLEAN DEFAULT false,
  
  -- Beds question
  beds_question_audio_url TEXT,
  beds_question_text TEXT DEFAULT 'כמה מיטות תוכל לארח? הקש את המספר.',
  beds_question_use_audio BOOLEAN DEFAULT false,
  
  -- Accept confirmation
  accept_confirmation_audio_url TEXT,
  accept_confirmation_text TEXT DEFAULT 'תודה רבה! הרישום נשמר בהצלחה.',
  accept_confirmation_use_audio BOOLEAN DEFAULT false,
  
  -- Goodbye
  goodbye_audio_url TEXT,
  goodbye_text TEXT DEFAULT 'להתראות!',
  goodbye_use_audio BOOLEAN DEFAULT false,
  
  -- Decline message
  decline_audio_url TEXT,
  decline_text TEXT DEFAULT 'תודה על ההודעה. להתראות.',
  decline_use_audio BOOLEAN DEFAULT false,
  
  -- Friday callback
  friday_callback_audio_url TEXT,
  friday_callback_text TEXT DEFAULT 'נרשמת לשיחה חוזרת ביום שישי. להתראות.',
  friday_callback_use_audio BOOLEAN DEFAULT false,
  
  -- Guest info introduction
  guest_info_audio_url TEXT,
  guest_info_text TEXT DEFAULT 'פרטי האורחים שלך:',
  guest_info_use_audio BOOLEAN DEFAULT false,
  
  -- No beds needed
  no_beds_needed_audio_url TEXT,
  no_beds_needed_text TEXT DEFAULT 'תודה! כרגע יש לנו מספיק מיטות. נתקשר שוב בשבוע הבא.',
  no_beds_needed_use_audio BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE call_audio_config ENABLE ROW LEVEL SECURITY;

-- Allow all access
CREATE POLICY "Allow all operations on call_audio_config" ON call_audio_config
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default config
INSERT INTO call_audio_config (id, config_name, is_active) VALUES (gen_random_uuid(), 'weekly_availability', true);

COMMENT ON TABLE call_queue IS 'Queue for sequential calling - calls one host at a time';
COMMENT ON TABLE call_audio_config IS 'Configuration for which audio/text to play at each position in the call';
