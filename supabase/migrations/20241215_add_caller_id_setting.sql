-- Add caller ID override setting
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('custom_caller_id', '', 'Custom phone number to display as caller ID (must be verified with Twilio). Leave empty to use default Twilio number.')
ON CONFLICT (setting_key) DO UPDATE SET description = EXCLUDED.description;
