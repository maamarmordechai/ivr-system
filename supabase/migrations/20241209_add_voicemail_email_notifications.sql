-- Add email notification settings for voicemails
-- This allows admins to receive emails when voicemails arrive

-- Add email notification columns to voicemail_boxes
ALTER TABLE voicemail_boxes 
ADD COLUMN IF NOT EXISTS email_notifications TEXT[] DEFAULT '{}';

COMMENT ON COLUMN voicemail_boxes.email_notifications IS 'Array of email addresses to notify when voicemails arrive in this box';

-- Create a global system settings table for default email addresses
CREATE TABLE IF NOT EXISTS system_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  email_addresses TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_email_settings IS 'Global email notification settings for various system events';

-- Insert default voicemail notification setting
INSERT INTO system_email_settings (setting_key, email_addresses, is_active)
VALUES ('voicemail_notifications', '{}', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Add email_sent tracking to voicemails table
ALTER TABLE voicemails
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_recipients TEXT[];

COMMENT ON COLUMN voicemails.email_sent IS 'Whether notification email was sent for this voicemail';
COMMENT ON COLUMN voicemails.email_sent_at IS 'When the email notification was sent';
COMMENT ON COLUMN voicemails.email_recipients IS 'List of email addresses that received notification';

-- Create function to get all email recipients for a voicemail box
CREATE OR REPLACE FUNCTION get_voicemail_email_recipients(box_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  box_emails TEXT[];
  global_emails TEXT[];
  all_emails TEXT[];
BEGIN
  -- Get emails from voicemail box
  SELECT COALESCE(email_notifications, '{}') INTO box_emails
  FROM voicemail_boxes
  WHERE id = box_id;
  
  -- Get global default emails
  SELECT COALESCE(email_addresses, '{}') INTO global_emails
  FROM system_email_settings
  WHERE setting_key = 'voicemail_notifications' AND is_active = true;
  
  -- Combine and deduplicate
  all_emails := ARRAY(
    SELECT DISTINCT unnest(box_emails || global_emails)
  );
  
  RETURN all_emails;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_voicemail_email_recipients IS 'Returns combined list of email recipients for a voicemail box';

-- Create view for easy email configuration management
CREATE OR REPLACE VIEW voicemail_email_config AS
SELECT 
  vb.id as box_id,
  vb.box_number,
  vb.box_name,
  vb.email_notifications as box_emails,
  ses.email_addresses as global_emails,
  get_voicemail_email_recipients(vb.id) as all_recipients
FROM voicemail_boxes vb
CROSS JOIN system_email_settings ses
WHERE ses.setting_key = 'voicemail_notifications';

-- Test the setup
SELECT 
  'System Email Settings' as config_type,
  setting_key,
  email_addresses,
  is_active
FROM system_email_settings
WHERE setting_key = 'voicemail_notifications'

UNION ALL

SELECT 
  'Voicemail Box Config' as config_type,
  box_number || ' - ' || box_name as setting_key,
  email_notifications as email_addresses,
  is_active
FROM voicemail_boxes
ORDER BY config_type, setting_key;
