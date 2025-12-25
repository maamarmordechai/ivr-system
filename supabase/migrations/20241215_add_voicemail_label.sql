-- Add label column to voicemails table for easy identification
-- This allows naming voicemails like "Availability Question", "Thank You Message", etc.

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voicemails' 
    AND column_name = 'label'
  ) THEN
    ALTER TABLE voicemails ADD COLUMN label TEXT;
  END IF;
END $$;

COMMENT ON COLUMN voicemails.label IS 'Custom label for identifying voicemail purpose (e.g., "Availability Question")';
