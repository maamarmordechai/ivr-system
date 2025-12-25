-- Run this SQL in Supabase SQL Editor to create meal hosting tables

-- Table for meal hosts
CREATE TABLE IF NOT EXISTS meal_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for meal availabilities per week
CREATE TABLE IF NOT EXISTS meal_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES desperate_weeks(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES meal_hosts(id) ON DELETE CASCADE,
  day_meal_guests INTEGER DEFAULT 0,
  night_meal_guests INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  call_sid TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, host_id)
);

-- Table for meal call tracking
CREATE TABLE IF NOT EXISTS meal_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES desperate_weeks(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES meal_hosts(id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'initiated',
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for meal audio settings
CREATE TABLE IF NOT EXISTS meal_audio_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_key TEXT NOT NULL UNIQUE,
  audio_url TEXT,
  default_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default audio settings
INSERT INTO meal_audio_settings (audio_key, default_text) VALUES
  ('intro', 'Hello, this is the weekly meal hosting confirmation call.'),
  ('guest_count_prompt', 'We are looking for hosts for guests this Shabbat. How many guests can you host? Press 0 if you cannot host this week.'),
  ('meal_selection', 'Which meals can you provide? Press 1 for Friday night dinner only, press 2 for Saturday day meal only, or press 3 for both meals.'),
  ('day_meal_only', 'Thank you for hosting the Saturday day meal.'),
  ('night_meal_only', 'Thank you for hosting the Friday night meal.'),
  ('both_meals', 'Thank you for hosting both Friday night and Saturday day meals.'),
  ('thank_you', 'Your confirmation has been recorded. Thank you and Shabbat Shalom.')
ON CONFLICT (audio_key) DO NOTHING;

-- Enable RLS
ALTER TABLE meal_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_audio_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read meal hosts" ON meal_hosts;
CREATE POLICY "Allow authenticated users to read meal hosts" ON meal_hosts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert meal hosts" ON meal_hosts;
CREATE POLICY "Allow authenticated users to insert meal hosts" ON meal_hosts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update meal hosts" ON meal_hosts;
CREATE POLICY "Allow authenticated users to update meal hosts" ON meal_hosts FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete meal hosts" ON meal_hosts;
CREATE POLICY "Allow authenticated users to delete meal hosts" ON meal_hosts FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read meal availabilities" ON meal_availabilities;
CREATE POLICY "Allow authenticated users to read meal availabilities" ON meal_availabilities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert meal availabilities" ON meal_availabilities;
CREATE POLICY "Allow authenticated users to insert meal availabilities" ON meal_availabilities FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update meal availabilities" ON meal_availabilities;
CREATE POLICY "Allow authenticated users to update meal availabilities" ON meal_availabilities FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete meal availabilities" ON meal_availabilities;
CREATE POLICY "Allow authenticated users to delete meal availabilities" ON meal_availabilities FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read meal calls" ON meal_calls;
CREATE POLICY "Allow authenticated users to read meal calls" ON meal_calls FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert meal calls" ON meal_calls;
CREATE POLICY "Allow authenticated users to insert meal calls" ON meal_calls FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update meal calls" ON meal_calls;
CREATE POLICY "Allow authenticated users to update meal calls" ON meal_calls FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read meal audio settings" ON meal_audio_settings;
CREATE POLICY "Allow authenticated users to read meal audio settings" ON meal_audio_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update meal audio settings" ON meal_audio_settings;
CREATE POLICY "Allow authenticated users to update meal audio settings" ON meal_audio_settings FOR UPDATE TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_availabilities_week_id ON meal_availabilities(week_id);
CREATE INDEX IF NOT EXISTS idx_meal_availabilities_host_id ON meal_availabilities(host_id);
CREATE INDEX IF NOT EXISTS idx_meal_calls_week_id ON meal_calls(week_id);
CREATE INDEX IF NOT EXISTS idx_meal_calls_host_id ON meal_calls(host_id);
CREATE INDEX IF NOT EXISTS idx_meal_hosts_phone ON meal_hosts(phone_number);
CREATE INDEX IF NOT EXISTS idx_meal_hosts_active ON meal_hosts(is_active);
