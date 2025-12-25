-- Major System Redesign: Open Call-In System
-- Remove guest tracking, focus on capacity management

-- Update apartments table to track call history and priority
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS last_helped_date DATE;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS times_helped INTEGER DEFAULT 0;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS wants_weekly_calls BOOLEAN DEFAULT true;

-- Add weekly bed tracking table
CREATE TABLE IF NOT EXISTS weekly_bed_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES desperate_weeks(id) ON DELETE CASCADE,
  beds_needed INTEGER DEFAULT 30,
  beds_confirmed INTEGER DEFAULT 0,
  meals_needed INTEGER DEFAULT 30,
  friday_night_meals_confirmed INTEGER DEFAULT 0,
  saturday_day_meals_confirmed INTEGER DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id)
);

-- Add host registration voicemail box
INSERT INTO voicemail_boxes (box_number, box_name, description, is_active)
VALUES (99, 'Host Registration', 'New host name recordings', true)
ON CONFLICT (box_number) DO NOTHING;

-- Add system settings table for admin functions
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('admin_menu_digit', '8', 'Digit to access admin menu'),
  ('admin_password', '7587', 'Password for admin access'),
  ('default_beds_needed', '30', 'Default number of beds needed per week'),
  ('default_meals_needed', '30', 'Default number of meals needed per week')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- RLS for new tables
ALTER TABLE weekly_bed_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read weekly bed tracking" ON weekly_bed_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert weekly bed tracking" ON weekly_bed_tracking FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update weekly bed tracking" ON weekly_bed_tracking FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read system settings" ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to update system settings" ON system_settings FOR UPDATE TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_apartments_last_helped ON apartments(last_helped_date NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_apartments_priority ON apartments(times_helped, last_helped_date);
CREATE INDEX IF NOT EXISTS idx_weekly_tracking_week ON weekly_bed_tracking(week_id);

-- Function to increment beds confirmed
CREATE OR REPLACE FUNCTION increment_beds_confirmed(p_week_id UUID, p_beds INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO weekly_bed_tracking (week_id, beds_confirmed)
  VALUES (p_week_id, p_beds)
  ON CONFLICT (week_id) 
  DO UPDATE SET beds_confirmed = weekly_bed_tracking.beds_confirmed + p_beds;
END;
$$ LANGUAGE plpgsql;

-- Function to increment meals confirmed
CREATE OR REPLACE FUNCTION increment_meals_confirmed(p_week_id UUID, p_friday_night INTEGER, p_saturday_day INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO weekly_bed_tracking (week_id, friday_night_meals_confirmed, saturday_day_meals_confirmed)
  VALUES (p_week_id, p_friday_night, p_saturday_day)
  ON CONFLICT (week_id) 
  DO UPDATE SET 
    friday_night_meals_confirmed = weekly_bed_tracking.friday_night_meals_confirmed + p_friday_night,
    saturday_day_meals_confirmed = weekly_bed_tracking.saturday_day_meals_confirmed + p_saturday_day;
END;
$$ LANGUAGE plpgsql;
