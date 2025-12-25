-- Create voicemail boxes for your apartments
-- Run this in Supabase SQL Editor

-- First, let's see what apartments exist
-- SELECT id, person_name, phone_number FROM apartments ORDER BY person_name;

-- Create voicemail boxes (one per apartment)
-- Box 1 - General voicemail
INSERT INTO voicemail_boxes (box_number, box_name, description, is_active, priority_level)
VALUES 
  ('1', 'General Voicemail', 'General voicemail box for all callers', true, 1)
ON CONFLICT (box_number) DO NOTHING;

-- Verify the voicemail box was created
SELECT 
  box_number,
  box_name,
  description,
  is_active
FROM voicemail_boxes
ORDER BY box_number;

-- Note: Apartments will access voicemails by owner phone number matching
-- The check-voicemails-ivr function queries apartments by caller phone
-- and shows their voicemails automatically
