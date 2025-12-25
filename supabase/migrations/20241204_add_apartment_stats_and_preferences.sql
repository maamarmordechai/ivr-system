-- Add guest statistics and call frequency tracking to apartments table

-- Add guest statistics columns
ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS total_guests_hosted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_couples_hosted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_individuals_hosted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_guest_date TIMESTAMP WITH TIME ZONE;

-- Add call frequency preference
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS call_frequency TEXT DEFAULT 'weekly' CHECK (call_frequency IN ('weekly', 'bi-weekly', 'desperate-only', 'never'));

COMMENT ON COLUMN apartments.total_guests_hosted IS 'Total number of guests hosted all time';
COMMENT ON COLUMN apartments.total_couples_hosted IS 'Total number of couples hosted';
COMMENT ON COLUMN apartments.total_individuals_hosted IS 'Total number of individual guests hosted';
COMMENT ON COLUMN apartments.last_guest_date IS 'Date of most recent guest check-in';
COMMENT ON COLUMN apartments.call_frequency IS 'How often to call: weekly, bi-weekly, desperate-only, or never';

-- Add two-couples question settings to call_settings
ALTER TABLE call_settings
ADD COLUMN IF NOT EXISTS two_couples_question TEXT DEFAULT 'You have multiple bedrooms. Can you accommodate 2 couples in separate rooms? Press 1 for yes, or 2 for no.',
ADD COLUMN IF NOT EXISTS two_couples_audio_url TEXT;

COMMENT ON COLUMN call_settings.two_couples_question IS 'Text-to-speech question for two couples availability';
COMMENT ON COLUMN call_settings.two_couples_audio_url IS 'URL to audio recording for two couples question';

-- Create desperate_weeks table to mark specific weeks
CREATE TABLE IF NOT EXISTS desperate_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL UNIQUE,
  week_end_date DATE NOT NULL,
  parsha_name TEXT,
  parsha_name_hebrew TEXT,
  is_desperate BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE desperate_weeks IS 'Marks specific Shabbat weeks as desperate (need extra calls)';
COMMENT ON COLUMN desperate_weeks.week_start_date IS 'Friday date (start of Shabbat week)';
COMMENT ON COLUMN desperate_weeks.week_end_date IS 'Saturday date (Shabbat)';
COMMENT ON COLUMN desperate_weeks.parsha_name IS 'Torah portion name for the week';
COMMENT ON COLUMN desperate_weeks.is_desperate IS 'Whether this week needs extra outreach';

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_desperate_weeks_dates ON desperate_weeks(week_start_date, week_end_date);
