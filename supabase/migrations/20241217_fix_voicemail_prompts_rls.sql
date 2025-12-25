-- Add INSERT policy for voicemail_audio_prompts table
-- This allows the frontend to create new prompt mappings

-- First, drop the existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to insert voicemail audio prompts" ON voicemail_audio_prompts;

-- Create INSERT policy for authenticated users
CREATE POLICY "Allow authenticated users to insert voicemail audio prompts"
  ON voicemail_audio_prompts FOR INSERT TO authenticated WITH CHECK (true);

-- Also add DELETE policy in case we need it
DROP POLICY IF EXISTS "Allow authenticated users to delete voicemail audio prompts" ON voicemail_audio_prompts;

CREATE POLICY "Allow authenticated users to delete voicemail audio prompts"
  ON voicemail_audio_prompts FOR DELETE TO authenticated USING (true);
