-- Add audio_url column to voicemail_audio_prompts table if it doesn't exist
-- This allows uploading MP3 files as an alternative to voicemail recordings

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voicemail_audio_prompts' 
    AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE voicemail_audio_prompts ADD COLUMN audio_url TEXT;
  END IF;
END $$;

COMMENT ON COLUMN voicemail_audio_prompts.audio_url IS 'Direct MP3 URL (alternative to voicemail recording)';
