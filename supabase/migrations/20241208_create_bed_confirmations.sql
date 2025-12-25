-- Create bed confirmations tracking table
-- This tracks each individual bed confirmation so we can void them

CREATE TABLE IF NOT EXISTS bed_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES desperate_weeks(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  beds_confirmed INTEGER NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_via TEXT, -- 'phone_call', 'manual', 'weekly_call'
  voided BOOLEAN DEFAULT false,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  void_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bed_confirmations_week ON bed_confirmations(week_id);
CREATE INDEX IF NOT EXISTS idx_bed_confirmations_apartment ON bed_confirmations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_bed_confirmations_voided ON bed_confirmations(voided);

-- Enable RLS
ALTER TABLE bed_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read bed confirmations" ON bed_confirmations;
CREATE POLICY "Allow authenticated users to read bed confirmations" 
  ON bed_confirmations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert bed confirmations" ON bed_confirmations;
CREATE POLICY "Allow authenticated users to insert bed confirmations" 
  ON bed_confirmations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update bed confirmations" ON bed_confirmations;
CREATE POLICY "Allow authenticated users to update bed confirmations" 
  ON bed_confirmations FOR UPDATE TO authenticated USING (true);

-- Function to calculate active (non-voided) bed confirmations
CREATE OR REPLACE FUNCTION get_active_bed_confirmations(p_week_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(beds_confirmed), 0)::INTEGER
  FROM bed_confirmations
  WHERE week_id = p_week_id AND voided = false;
$$ LANGUAGE SQL STABLE;
