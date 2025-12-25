-- FIX INCREMENT_BEDS_CONFIRMED FUNCTION
-- This function is required for beds to update
-- Run this in Supabase SQL Editor

-- Create or replace the increment function
CREATE OR REPLACE FUNCTION increment_beds_confirmed(p_week_id UUID, p_beds INTEGER)
RETURNS void AS $$
BEGIN
  -- Try to update existing record
  UPDATE weekly_bed_tracking 
  SET beds_confirmed = COALESCE(beds_confirmed, 0) + p_beds,
      updated_at = NOW()
  WHERE week_id = p_week_id;
  
  -- If no rows updated, insert new record
  IF NOT FOUND THEN
    INSERT INTO weekly_bed_tracking (week_id, beds_needed, beds_confirmed)
    VALUES (p_week_id, 30, p_beds);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure weekly_bed_tracking table exists
CREATE TABLE IF NOT EXISTS weekly_bed_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID REFERENCES desperate_weeks(id) ON DELETE CASCADE,
  beds_needed INTEGER DEFAULT 30,
  beds_confirmed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_id)
);

-- Create a record for the current week if it doesn't exist
INSERT INTO weekly_bed_tracking (week_id, beds_needed, beds_confirmed)
SELECT id, 30, 0
FROM desperate_weeks
WHERE CURRENT_DATE BETWEEN week_start_date AND week_end_date
ON CONFLICT (week_id) DO NOTHING;

-- Verify it worked
SELECT * FROM weekly_bed_tracking 
WHERE week_id = (
  SELECT id FROM desperate_weeks 
  WHERE CURRENT_DATE BETWEEN week_start_date AND week_end_date
  LIMIT 1
);
