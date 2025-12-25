-- Add name recording URL to apartments table
-- This stores the host's name recording from registration

ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS name_recording_url TEXT;

COMMENT ON COLUMN apartments.name_recording_url IS 'URL to the hosts name recording from registration';

-- Create voicemail box 99 for host name recordings if it doesn't exist
INSERT INTO voicemail_boxes (box_number, box_name, description, is_active, priority_level)
VALUES ('99', 'Host Name Recordings', 'Name recordings from host registration system', true, 50)
ON CONFLICT (box_number) 
DO UPDATE SET
  box_name = 'Host Name Recordings',
  description = 'Name recordings from host registration system',
  is_active = true,
  priority_level = 50;

-- Verify setup
SELECT 
  box_number,
  box_name,
  description,
  is_active
FROM voicemail_boxes 
WHERE box_number = '99';
