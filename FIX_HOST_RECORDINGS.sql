-- Fix Host Name Recording System
-- This ensures host name recordings are saved properly and can be played back

-- 1. Ensure voicemail box 99 exists for host registrations
INSERT INTO voicemail_boxes (box_number, box_name, description, is_active, priority_level)
VALUES ('99', 'Host Name Recordings', 'Name recordings from host registration system', true, 50)
ON CONFLICT (box_number) 
DO UPDATE SET
  box_name = 'Host Name Recordings',
  description = 'Name recordings from host registration system',
  is_active = true,
  priority_level = 50;

-- 2. Check existing recordings in box 99
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

-- 3. View all voicemail boxes to confirm setup
SELECT 
  box_number,
  box_name,
  description,
  is_active,
  priority_level,
  (SELECT COUNT(*) FROM voicemails WHERE voicemail_box_id = voicemail_boxes.id) as voicemail_count
FROM voicemail_boxes
ORDER BY box_number;

-- 4. Check if call-audio storage bucket exists
-- Note: Run this in Supabase Storage UI or via SQL if you have storage extension
-- The bucket should be PUBLIC so recordings can be played

-- If you see recordings but can't play them, the issue is likely:
-- A) Storage bucket 'call-audio' doesn't exist
-- B) Storage bucket is private (should be public for playback)
-- C) RLS policies are blocking access

-- To fix playback, ensure:
-- 1. Bucket 'call-audio' exists and is public
-- 2. Or update handle-host-name-recording to use 'voicemail-recordings' bucket instead
