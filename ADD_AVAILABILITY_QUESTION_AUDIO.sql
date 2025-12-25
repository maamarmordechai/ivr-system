-- Add the availability_question audio configuration
-- This is the prompt asking: Press 1 if available, 2 if not, 3 for Friday callback

-- First check if the column exists
-- If you get an error, you may need to add the column first

UPDATE call_audio_config
SET 
  availability_question_text = 'Press 1 if you can host guests this Shabbos. Press 2 if you cannot host this week. Press 3 if you want us to call you back on Friday.',
  availability_question_audio_url = NULL,  -- Set this to your MP3 URL when ready
  use_availability_question_audio = false  -- Set to true when you upload the MP3
WHERE id IS NOT NULL;

-- To upload the MP3 and use it:
-- 1. Upload your MP3 file to Supabase Storage
-- 2. Get the public URL
-- 3. Update: SET availability_question_audio_url = 'YOUR_MP3_URL', use_availability_question_audio = true
