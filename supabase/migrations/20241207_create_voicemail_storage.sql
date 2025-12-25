-- Create storage bucket for voicemail recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voicemail-recordings',
  'voicemail-recordings',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for voicemail recordings
CREATE POLICY "Allow public read access to voicemail recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'voicemail-recordings');

CREATE POLICY "Allow authenticated users to upload voicemail recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voicemail-recordings');

CREATE POLICY "Allow service role to manage voicemail recordings"
ON storage.objects FOR ALL
USING (bucket_id = 'voicemail-recordings');

-- Add recording_sid column if it doesn't exist
ALTER TABLE voicemails ADD COLUMN IF NOT EXISTS recording_sid TEXT;
CREATE INDEX IF NOT EXISTS idx_voicemails_recording_sid ON voicemails(recording_sid);

COMMENT ON COLUMN voicemails.recording_sid IS 'Twilio recording SID for reference';
