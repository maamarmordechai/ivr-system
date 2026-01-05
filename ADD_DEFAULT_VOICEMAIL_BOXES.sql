-- Add default voicemail boxes if they don't exist
-- Run this in Supabase SQL Editor

-- First, let's see what boxes exist
SELECT box_number, box_name, is_active, description FROM voicemail_boxes ORDER BY box_number;

-- Insert default boxes (will skip if box_number already exists)
INSERT INTO voicemail_boxes (box_number, box_name, description, greeting_message, is_active, priority_level)
VALUES 
  ('0', 'Main Office', 'General inquiries and main office', 'You have reached the main office. Please leave a message after the beep.', true, 100),
  ('1', 'Guest Registration', 'Guest registration inquiries', 'You have reached guest registration. Please leave your name, phone number, and check-in dates after the beep.', true, 50),
  ('2', 'Host Registration', 'Host and apartment registration', 'You have reached host registration. Please leave your name, phone number, and property details after the beep.', true, 50),
  ('3', 'Urgent Matters', 'Urgent and emergency matters', 'This is the urgent matters line. Please leave a detailed message about your urgent situation after the beep.', true, 90),
  ('4', 'Availability Questions', 'Questions about availability', 'Please leave your question about availability after the beep.', true, 40),
  ('5', 'Billing & Payments', 'Billing and payment inquiries', 'You have reached the billing department. Please leave your name, phone number, and inquiry after the beep.', true, 30),
  ('99', 'Host Name Recordings', 'New host name recordings', 'Please say your name clearly after the beep.', true, 10)
ON CONFLICT (box_number) DO UPDATE SET
  description = EXCLUDED.description,
  greeting_message = COALESCE(voicemail_boxes.greeting_message, EXCLUDED.greeting_message);

-- Verify boxes after insert
SELECT 
  box_number, 
  box_name, 
  is_active,
  description,
  CASE WHEN email_notifications IS NOT NULL AND array_length(email_notifications, 1) > 0 
       THEN 'Has ' || array_length(email_notifications, 1) || ' email(s)' 
       ELSE 'No emails' 
  END as notifications
FROM voicemail_boxes 
ORDER BY box_number::integer;
