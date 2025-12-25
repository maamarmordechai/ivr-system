# Convert MP3 files to Twilio-compatible WAV format
# Run these commands to convert your MP3 files

# 1. Convert after_name from MP3 to WAV
ffmpeg -i "after_name.mp3" -ar 8000 -ac 1 -c:a pcm_mulaw "after_name.wav"

# 2. Convert beds_question from MP3 to WAV
ffmpeg -i "beds_question.mp3" -ar 8000 -ac 1 -c:a pcm_mulaw "beds_question.wav"

# 3. Convert accept_confirmation from MP3 to WAV
ffmpeg -i "accept_confirmation.mp3" -ar 8000 -ac 1 -c:a pcm_mulaw "accept_confirmation.wav"

# 4. Convert decline from MP3 to WAV
ffmpeg -i "decline.mp3" -ar 8000 -ac 1 -c:a pcm_mulaw "decline.wav"

# After conversion:
# 1. Upload the new .wav files to Supabase Storage
# 2. Update the URLs in call_audio_config table
# 3. The screechy noise will be gone!
