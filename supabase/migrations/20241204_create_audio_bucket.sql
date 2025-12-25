-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for audio-recordings bucket
-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-recordings');

-- Allow authenticated users to update their audio files
CREATE POLICY "Authenticated users can update audio files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio-recordings');

-- Allow authenticated users to delete audio files
CREATE POLICY "Authenticated users can delete audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-recordings');

-- Allow public read access to audio files (needed for Twilio to play them)
CREATE POLICY "Public can view audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-recordings');
