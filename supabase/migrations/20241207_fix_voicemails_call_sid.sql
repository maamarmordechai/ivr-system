-- Fix voicemails table to add missing call_sid column
-- This fixes the error: "Could not find the 'call_sid' column of 'voicemails' in the schema cache"

-- Add call_sid column if it doesn't exist
ALTER TABLE voicemails ADD COLUMN IF NOT EXISTS call_sid TEXT;

-- Create index on call_sid for faster lookups
CREATE INDEX IF NOT EXISTS idx_voicemails_call_sid ON voicemails(call_sid);

-- Add comment
COMMENT ON COLUMN voicemails.call_sid IS 'Twilio Call SID for tracking which call generated this voicemail';
