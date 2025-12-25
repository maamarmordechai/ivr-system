-- Create incoming_calls table to track all inbound calls
CREATE TABLE IF NOT EXISTS incoming_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  call_sid TEXT NOT NULL UNIQUE,
  apartment_id UUID REFERENCES apartments(id),
  menu_selection TEXT,
  beds_offered INTEGER,
  accepts_couples BOOLEAN,
  pending_guests_count INTEGER,
  guests_assigned INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_incoming_calls_phone ON incoming_calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_incoming_calls_call_sid ON incoming_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_incoming_calls_apartment_id ON incoming_calls(apartment_id);
CREATE INDEX IF NOT EXISTS idx_incoming_calls_created_at ON incoming_calls(created_at);

-- Add is_couple field to guests table if it doesn't exist
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS is_couple BOOLEAN DEFAULT FALSE;

-- Add check_in_date and check_out_date to guests if they don't exist
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS check_in_date DATE,
ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- Comments for documentation
COMMENT ON TABLE incoming_calls IS 'Tracks all incoming calls to the IVR system';
COMMENT ON COLUMN incoming_calls.phone_number IS 'Phone number of the caller in E.164 format';
COMMENT ON COLUMN incoming_calls.call_sid IS 'Twilio call SID for tracking';
COMMENT ON COLUMN incoming_calls.apartment_id IS 'Apartment associated with the caller (if registered host)';
COMMENT ON COLUMN incoming_calls.menu_selection IS 'Main menu option selected (guest_registration, host_registration, check_availability)';
COMMENT ON COLUMN incoming_calls.beds_offered IS 'Number of beds the host offered';
COMMENT ON COLUMN incoming_calls.accepts_couples IS 'Whether the host accepts couples';
COMMENT ON COLUMN incoming_calls.guests_assigned IS 'Number of guests assigned during the call';
COMMENT ON COLUMN incoming_calls.status IS 'Call status (started, awaiting_beds_input, completed_assigned, completed_no_match, etc.)';
COMMENT ON COLUMN guests.is_couple IS 'Whether the guest entry represents a couple (requires 2 beds)';
