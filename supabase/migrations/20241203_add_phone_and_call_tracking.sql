-- Add phone_number column to apartments table if it doesn't exist
ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Update call_history table to support Twilio integration
ALTER TABLE call_history 
ADD COLUMN IF NOT EXISTS call_sid TEXT,
ADD COLUMN IF NOT EXISTS call_status TEXT,
ADD COLUMN IF NOT EXISTS call_duration INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_history_apartment_id ON call_history(apartment_id);
CREATE INDEX IF NOT EXISTS idx_call_history_call_sid ON call_history(call_sid);

-- Add comments for documentation
COMMENT ON COLUMN apartments.phone_number IS 'Phone number in E.164 format (e.g., +1234567890)';
COMMENT ON COLUMN call_history.call_sid IS 'Twilio call SID for tracking';
COMMENT ON COLUMN call_history.call_status IS 'Twilio call status (queued, ringing, in-progress, completed, etc.)';
COMMENT ON COLUMN call_history.call_duration IS 'Call duration in seconds';
