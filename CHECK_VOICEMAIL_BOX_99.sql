-- Check if voicemail box 99 exists (for host name recordings)
SELECT * FROM voicemail_boxes WHERE box_number = '99';

-- If it doesn't exist, create it
INSERT INTO voicemail_boxes (box_number, box_name, description, is_active, priority_level)
VALUES ('99', 'New Host Registrations', 'Name recordings from new host signups', true, 1)
ON CONFLICT DO NOTHING
RETURNING *;

-- Check all voicemail boxes
SELECT * FROM voicemail_boxes ORDER BY box_number;
