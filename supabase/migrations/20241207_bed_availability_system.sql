-- Bed Availability Management System
-- Simplified phone system focused on weekly bed availability

-- Drop existing tables if they exist
DROP TABLE IF EXISTS bed_assignments CASCADE;
DROP TABLE IF EXISTS bed_availability_responses CASCADE;
DROP TABLE IF EXISTS callback_queue CASCADE;
DROP TABLE IF EXISTS weekly_bed_needs CASCADE;

-- Weekly bed requirements
CREATE TABLE weekly_bed_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL UNIQUE, -- Friday of the week
  beds_needed INTEGER NOT NULL DEFAULT 0,
  beds_available INTEGER DEFAULT 0,
  beds_assigned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'collecting' CHECK (status IN ('collecting', 'sufficient', 'completed')),
  last_call_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Host responses to bed availability question
CREATE TABLE bed_availability_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES weekly_bed_needs(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  host_name TEXT,
  
  -- Response details
  response_type TEXT NOT NULL CHECK (response_type IN ('yes', 'no', 'partial', 'callback')),
  beds_offered INTEGER DEFAULT 0,
  couples_friendly BOOLEAN DEFAULT false,
  
  -- Call tracking
  call_sid TEXT,
  called_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  -- Assignment tracking
  beds_assigned INTEGER DEFAULT 0,
  is_fulfilled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(week_id, apartment_id)
);

-- Callback queue for Friday calls
CREATE TABLE callback_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES weekly_bed_needs(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id),
  phone_number TEXT NOT NULL,
  host_name TEXT,
  
  -- Callback scheduling
  callback_reason TEXT CHECK (callback_reason IN ('requested', 'no_answer', 'insufficient_beds')),
  scheduled_for TIMESTAMPTZ NOT NULL, -- Next Friday
  attempt_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bed assignments (simplified)
CREATE TABLE bed_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES weekly_bed_needs(id) ON DELETE CASCADE,
  response_id UUID REFERENCES bed_availability_responses(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  
  beds_count INTEGER NOT NULL DEFAULT 1,
  is_couple BOOLEAN DEFAULT false,
  
  assigned_by TEXT, -- User email who made the assignment
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bed_responses_week ON bed_availability_responses(week_id);
CREATE INDEX idx_bed_responses_phone ON bed_availability_responses(phone_number);
CREATE INDEX idx_callback_queue_scheduled ON callback_queue(scheduled_for, status);
CREATE INDEX idx_bed_assignments_week ON bed_assignments(week_id);
CREATE INDEX idx_bed_assignments_guest ON bed_assignments(guest_id);

-- Function to get current week
CREATE OR REPLACE FUNCTION get_current_week()
RETURNS UUID AS $$
DECLARE
  v_week_id UUID;
  v_friday DATE;
BEGIN
  -- Get upcoming Friday
  v_friday := CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER;
  IF EXTRACT(DOW FROM CURRENT_DATE) = 5 THEN
    v_friday := CURRENT_DATE; -- Today is Friday
  ELSIF EXTRACT(DOW FROM CURRENT_DATE) > 5 THEN
    v_friday := CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE) + 5)::INTEGER; -- Next week Friday
  END IF;
  
  -- Get or create week record
  SELECT id INTO v_week_id
  FROM weekly_bed_needs
  WHERE week_start_date = v_friday;
  
  IF NOT FOUND THEN
    INSERT INTO weekly_bed_needs (week_start_date, beds_needed)
    VALUES (v_friday, 0)
    RETURNING id INTO v_week_id;
  END IF;
  
  RETURN v_week_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update week status
CREATE OR REPLACE FUNCTION update_week_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE weekly_bed_needs
  SET 
    beds_available = (
      SELECT COALESCE(SUM(beds_offered - beds_assigned), 0)
      FROM bed_availability_responses
      WHERE week_id = NEW.week_id
        AND response_type IN ('yes', 'partial')
    ),
    beds_assigned = (
      SELECT COALESCE(SUM(beds_count), 0)
      FROM bed_assignments
      WHERE week_id = NEW.week_id
        AND status = 'active'
    ),
    status = CASE
      WHEN (
        SELECT COALESCE(SUM(beds_offered), 0)
        FROM bed_availability_responses
        WHERE week_id = NEW.week_id
      ) >= beds_needed THEN 'sufficient'
      ELSE 'collecting'
    END,
    updated_at = NOW()
  WHERE id = NEW.week_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_week_on_response
  AFTER INSERT OR UPDATE OR DELETE ON bed_availability_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_week_status();

CREATE TRIGGER update_week_on_assignment
  AFTER INSERT OR UPDATE OR DELETE ON bed_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_week_status();

-- RLS Policies
ALTER TABLE weekly_bed_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_availability_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON weekly_bed_needs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON bed_availability_responses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON callback_queue FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON bed_assignments FOR ALL TO authenticated USING (true);

-- Allow anon (Edge Functions) to read and write
CREATE POLICY "Allow anon read/write" ON weekly_bed_needs FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read/write" ON bed_availability_responses FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read/write" ON callback_queue FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read/write" ON bed_assignments FOR ALL TO anon USING (true);

-- Initialize current week
SELECT get_current_week();
