-- Migrate voicemails table from old schema to new schema
-- This aligns the database with the code expectations

-- Step 1: Add new columns that don't exist
ALTER TABLE voicemails ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE voicemails ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE voicemails ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;

-- Step 2: Migrate data from old columns to new columns
UPDATE voicemails 
SET duration_seconds = recording_duration 
WHERE duration_seconds IS NULL AND recording_duration IS NOT NULL;

UPDATE voicemails 
SET status = CASE 
  WHEN listened = true THEN 'listened'
  ELSE 'new'
END
WHERE status IS NULL OR status = 'new';

-- Step 3: Drop old columns (optional - comment out if you want to keep them)
-- ALTER TABLE voicemails DROP COLUMN IF EXISTS recording_duration;
-- ALTER TABLE voicemails DROP COLUMN IF EXISTS listened;
-- ALTER TABLE voicemails DROP COLUMN IF EXISTS caller_name;

-- Step 4: Add constraint for status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'voicemail_status_check'
  ) THEN
    ALTER TABLE voicemails 
    ADD CONSTRAINT voicemail_status_check 
    CHECK (status IN ('new', 'listened', 'archived', 'returned'));
  END IF;
END $$;

-- Step 5: Update comments
COMMENT ON COLUMN voicemails.status IS 'new=not listened, listened=played, returned=callback made, archived=done';
COMMENT ON COLUMN voicemails.duration_seconds IS 'Recording duration in seconds';
COMMENT ON COLUMN voicemails.call_sid IS 'Twilio Call SID for tracking which call generated this voicemail';
