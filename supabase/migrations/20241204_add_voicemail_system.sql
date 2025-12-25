-- Complete Voicemail & IVR Menu System
-- Supports multi-level menus and departmental voicemail boxes

-- Create voicemail_boxes table (different departments/purposes)
CREATE TABLE IF NOT EXISTS voicemail_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_name TEXT NOT NULL UNIQUE,
  box_number TEXT NOT NULL UNIQUE, -- e.g., "1", "2", "11", "12" for sub-menus
  description TEXT,
  greeting_message TEXT,
  greeting_audio_url TEXT,
  parent_box_id UUID REFERENCES voicemail_boxes(id), -- For sub-menus
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voicemails table (actual recordings)
CREATE TABLE IF NOT EXISTS voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voicemail_box_id UUID REFERENCES voicemail_boxes(id) ON DELETE CASCADE,
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  recording_url TEXT NOT NULL,
  recording_sid TEXT UNIQUE,
  recording_duration INTEGER, -- seconds
  transcription TEXT, -- Optional Twilio transcription
  listened BOOLEAN DEFAULT false,
  listened_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- Staff notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create IVR menu structure table
CREATE TABLE IF NOT EXISTS ivr_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_name TEXT NOT NULL,
  menu_level INTEGER DEFAULT 1, -- 1 = main menu, 2 = sub-menu, etc.
  parent_menu_id UUID REFERENCES ivr_menus(id),
  digit_pressed TEXT NOT NULL, -- "1", "2", "3", etc.
  action_type TEXT NOT NULL CHECK (action_type IN ('voicemail', 'sub_menu', 'transfer', 'hangup', 'custom')),
  voicemail_box_id UUID REFERENCES voicemail_boxes(id),
  next_menu_id UUID REFERENCES ivr_menus(id),
  prompt_message TEXT NOT NULL,
  prompt_audio_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voicemails_box_id ON voicemails(voicemail_box_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_listened ON voicemails(listened);
CREATE INDEX IF NOT EXISTS idx_voicemails_created_at ON voicemails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voicemail_boxes_parent ON voicemail_boxes(parent_box_id);
CREATE INDEX IF NOT EXISTS idx_ivr_menus_parent ON ivr_menus(parent_menu_id);

-- Insert default voicemail boxes
INSERT INTO voicemail_boxes (box_name, box_number, description, greeting_message) VALUES
('Main Office', '0', 'General inquiries and main office', 'You have reached the main office. Please leave a message after the beep.'),
('Guest Registration', '1', 'Guest registration inquiries', 'You have reached guest registration. Please leave your name, phone number, and check-in dates after the beep.'),
('Host/Apartment Registration', '2', 'Host and apartment registration', 'You have reached host registration. Please leave your name, phone number, and property details after the beep.'),
('Billing & Payments', '11', 'Billing and payment inquiries (Press 1 then 1)', 'You have reached billing department. Please leave your name, phone number, and inquiry after the beep.'),
('Technical Support', '12', 'Technical support (Press 1 then 2)', 'You have reached technical support. Please describe your issue after the beep.'),
('Urgent Matters', '3', 'Urgent and emergency matters', 'This is the urgent matters line. Please leave a detailed message about your urgent situation after the beep.')
ON CONFLICT (box_name) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE voicemail_boxes IS 'Different voicemail boxes/departments for IVR system';
COMMENT ON TABLE voicemails IS 'Actual voicemail recordings left by callers';
COMMENT ON TABLE ivr_menus IS 'IVR menu structure with multi-level support';
COMMENT ON COLUMN voicemail_boxes.parent_box_id IS 'Links to parent box for sub-menus (e.g., Billing is under Guest Services)';
COMMENT ON COLUMN voicemails.listened IS 'Whether staff has listened to this voicemail';
COMMENT ON COLUMN voicemails.transcription IS 'Optional Twilio speech-to-text transcription';
COMMENT ON COLUMN ivr_menus.action_type IS 'What happens when digit pressed: voicemail, sub_menu, transfer, hangup, custom';
