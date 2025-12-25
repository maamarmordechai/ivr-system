# Audio Upload Setup Guide

## What's New

The system now supports uploading MP3 files directly to Supabase Storage instead of requiring external hosting.

## Setup Steps

### 1. Create the Storage Bucket

Run this SQL in Supabase SQL Editor:

```sql
-- Run the migration file: 20241204_create_audio_bucket.sql
```

Or manually in the Supabase Dashboard:
1. Go to Storage section
2. Click "New bucket"
3. Name: `audio-recordings`
4. Public bucket: **YES** (checked)
5. Create bucket

### 2. Set Storage Policies

The migration file includes RLS policies that:
- Allow authenticated users to upload/update/delete files
- Allow public read access (needed for Twilio to play the audio)

If creating manually, add these policies in Storage > Policies:
- INSERT: authenticated users
- SELECT: public access
- UPDATE: authenticated users  
- DELETE: authenticated users

### 3. How It Works

#### In the UI:
1. Go to Call Settings tab
2. Check "Use Audio Recording" for any message
3. Click the file input button
4. Select your MP3/audio file
5. File uploads automatically to Supabase Storage
6. Audio player appears to preview the file
7. Click Save Settings to persist

#### Behind the Scenes:
- File uploads to `audio-recordings/call-audio/` folder
- Unique filename generated: `{field_name}_{timestamp}.{extension}`
- Public URL automatically saved to database
- Checkbox automatically enables when file uploaded
- Old files can be deleted with trash icon

#### Database Storage:
- URLs stored in `call_settings` table
- Columns: `welcome_audio_url`, `beds_audio_url`, etc.
- Toggles: `use_welcome_audio`, `use_beds_audio`, etc.

#### For Twilio:
- Public URLs work directly in TwiML `<Play>` tags
- No authentication needed (public bucket)
- Files are cached (3600 seconds)

## File Management

### Upload New File
- Check "Use Audio Recording"
- Choose file from file picker
- Wait for upload (shows "Uploading...")
- Audio player appears when complete

### Replace File
- Click trash icon to delete current file
- Upload new file using file picker

### Revert to Text-to-Speech
- Uncheck "Use Audio Recording"
- System will use text messages instead

## Supported Formats

- MP3 (recommended)
- WAV
- OGG
- M4A
- Any audio format supported by HTML5 `<audio>` tag

## Benefits

✅ No external hosting needed
✅ Files stored securely in your Supabase project
✅ Automatic URL generation
✅ Preview audio before saving
✅ Easy file management (upload/delete)
✅ Public access for Twilio playback
✅ Automatic unique filenames prevent conflicts

## Current Implementation Status

✅ Welcome message audio upload
✅ Beds question audio upload
⚠️ Need to add for: couple_question, mix_question, two_couples_question, crib_question

Next steps: Apply same upload pattern to remaining 4 message types.
