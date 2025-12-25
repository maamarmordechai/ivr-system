# Fix Host Name Recording System

## Problem
Host name recordings during registration are:
1. Being handled by Twilio (not your backend)
2. Can't be played back in the system
3. Not showing up properly in voicemail boxes

## Solution Overview
Recordings are now:
1. ✅ Downloaded from Twilio and uploaded to Supabase Storage
2. ✅ Saved in voicemail box 99 ("Host Name Recordings")
3. ✅ Linked to the apartment record for easy access
4. ✅ Playable in the Voicemails tab

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20241209_add_name_recording_url.sql`

Run this SQL in Supabase SQL Editor:
```sql
-- Add name recording URL to apartments table
ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS name_recording_url TEXT;

COMMENT ON COLUMN apartments.name_recording_url IS 'URL to the hosts name recording from registration';

-- Create voicemail box 99 for host name recordings
INSERT INTO voicemail_boxes (box_number, box_name, description, is_active, priority_level)
VALUES ('99', 'Host Name Recordings', 'Name recordings from host registration system', true, 50)
ON CONFLICT (box_number) 
DO UPDATE SET
  box_name = 'Host Name Recordings',
  description = 'Name recordings from host registration system',
  is_active = true,
  priority_level = 50;
```

### 2. Updated Edge Function
**File**: `supabase/functions/handle-host-name-recording/index.ts`

**Changes**:
- Changed storage bucket from `call-audio` → `voicemail-recordings` (consistent with other voicemails)
- Changed folder path from `host-names/` → `host-registrations/`
- Added auto-creation of voicemail box 99 if it doesn't exist
- Added apartment record update with recording URL
- Improved error handling and logging

**Key improvements**:
```typescript
// Now uses voicemail-recordings bucket (same as other voicemails)
const { error: uploadError } = await supabase.storage
  .from('voicemail-recordings')
  .upload(fileName, audioBlob, {
    contentType: 'audio/mpeg',
    cacheControl: '3600',
    upsert: true
  });

// Updates apartment with recording URL
await supabase
  .from('apartments')
  .update({ name_recording_url: urlData.publicUrl })
  .eq('id', apartmentId);
```

### 3. Verification SQL
**File**: `FIX_HOST_RECORDINGS.sql`

Use this to verify recordings are working:
```sql
-- Check recordings in box 99
SELECT 
  v.id,
  v.caller_phone,
  v.caller_name,
  v.recording_url,
  v.duration_seconds,
  v.status,
  v.listened,
  v.created_at,
  vb.box_name
FROM voicemails v
JOIN voicemail_boxes vb ON v.voicemail_box_id = vb.id
WHERE vb.box_number = '99'
ORDER BY v.created_at DESC;
```

## How It Works Now

### Registration Flow
1. Host calls and enters bed count
2. System prompts: "Please record your name after the beep"
3. **Twilio records the audio**
4. **Recording is sent to `handle-host-name-recording` function via callback**
5. Function downloads recording from Twilio
6. Function uploads to Supabase Storage (`voicemail-recordings/host-registrations/`)
7. Function saves to voicemail box 99
8. Function updates apartment record with recording URL
9. Admin can now:
   - Listen in Voicemails tab (filter to box 99)
   - See recording URL in apartment details
   - Play recording directly from either location

### Where to Find Recordings

**Voicemails Tab:**
- Navigate to "Voicemails" tab
- Filter to box "99 - Host Name Recordings"
- Click play button to listen

**Apartments Tab:**
- Navigate to "Hosts" tab
- View apartment details
- Recording URL stored in `name_recording_url` field

## Deployment Steps

1. **Run database migration:**
   ```sql
   -- In Supabase SQL Editor, run:
   -- supabase/migrations/20241209_add_name_recording_url.sql
   ```

2. **Deploy updated function:**
   ```powershell
   # In your terminal:
   supabase login
   supabase functions deploy handle-host-name-recording --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt
   ```

3. **Verify setup:**
   ```sql
   -- Check voicemail box exists
   SELECT * FROM voicemail_boxes WHERE box_number = '99';
   
   -- Check apartments have column
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'apartments' AND column_name = 'name_recording_url';
   ```

4. **Test:**
   - Call your Twilio number
   - Press 2 for "Register as Host"
   - Enter bed count
   - Record your name
   - Check Voicemails tab for box 99
   - Check if recording plays

## Troubleshooting

### Can't hear recording
**Cause**: Storage bucket permissions or CORS issue
**Fix**: 
1. Go to Supabase Storage
2. Check `voicemail-recordings` bucket is PUBLIC
3. Verify CORS allows audio playback

### Recording not saving
**Cause**: Voicemail box 99 doesn't exist
**Fix**: Run the SQL migration above (it creates box 99)

### Authentication error during deployment
**Cause**: Not logged into Supabase CLI
**Fix**: 
```powershell
supabase login
# Then try deployment again
```

### Recording URL is Twilio URL (not Supabase)
**Cause**: Function failed to upload to Supabase
**Fix**: Check function logs in Supabase Dashboard → Edge Functions → handle-host-name-recording → Logs

## Benefits of This Approach

1. ✅ **Recordings stored in your system** (not dependent on Twilio)
2. ✅ **Can be played back anytime** (Twilio recordings expire)
3. ✅ **Organized in voicemail system** (admins familiar with interface)
4. ✅ **Linked to host profile** (easy to access when managing hosts)
5. ✅ **Consistent with other voicemails** (same storage bucket, same UI)
6. ✅ **Auto-creates box 99** (if it doesn't exist)
7. ✅ **Detailed logging** (easier to troubleshoot issues)

## Next Steps

After deploying these changes:
1. Test full registration flow
2. Verify recordings appear in Voicemails tab
3. Check that recordings are playable
4. Consider adding recording playback to Hosts tab UI (future enhancement)
