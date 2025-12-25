-- Create 4 voicemail boxes for different message types

INSERT INTO voicemail_boxes (id, name, description, is_enabled)
VALUES 
  (101, 'General Inquiries', 'General questions and inquiries', true),
  (102, 'Host Registration', 'New hosts wanting to register', true),
  (103, 'Availability', 'Availability updates and bed confirmations', true),
  (104, 'Other Messages', 'Other messages that don''t fit in other categories', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled;

-- Verify
SELECT id, name, description, is_enabled
FROM voicemail_boxes
WHERE id IN (101, 102, 103, 104)
ORDER BY id;
