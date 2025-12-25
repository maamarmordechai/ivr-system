-- Create call_settings table
CREATE TABLE IF NOT EXISTS call_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_gender TEXT NOT NULL DEFAULT 'man',
  welcome_message TEXT NOT NULL DEFAULT 'Welcome to Accommodation Management System.',
  option_1_text TEXT NOT NULL DEFAULT 'Press 1 to register as a guest.',
  option_2_text TEXT NOT NULL DEFAULT 'Press 2 to register as a host.',
  option_3_text TEXT NOT NULL DEFAULT 'Press 3 to check if there are any assignments waiting for this week.',
  no_input_message TEXT NOT NULL DEFAULT 'Sorry, we didn''t receive any input. Goodbye.',
  guest_registration_message TEXT NOT NULL DEFAULT 'You have selected guest registration. Please visit our website or contact our office to complete the guest registration process. Thank you for calling. Goodbye.',
  host_registration_message TEXT NOT NULL DEFAULT 'You have selected host registration. Please visit our website or contact our office to complete the host registration process. Thank you for calling. Goodbye.',
  not_registered_message TEXT NOT NULL DEFAULT 'We could not find your phone number in our system. Please contact our office to register as a host first. Thank you for calling. Goodbye.',
  no_pending_message TEXT NOT NULL DEFAULT 'There are currently no guests waiting for assignment this week. Thank you for checking. Goodbye.',
  beds_question TEXT NOT NULL DEFAULT 'How many beds do you have available? Please enter a number from 1 to 9.',
  invalid_beds_message TEXT NOT NULL DEFAULT 'Invalid input. Please enter a number between 1 and 9.',
  couple_question TEXT NOT NULL DEFAULT 'Would you like to accept couples? Press 1 for yes, or 2 for no.',
  assignment_success_message TEXT NOT NULL DEFAULT 'Great! We have assigned guests to your apartment. You will receive details via email shortly. Thank you for your hospitality. Goodbye.',
  no_match_message TEXT NOT NULL DEFAULT 'Thank you for your offer. Unfortunately, we could not find matching guests at this time. We will contact you if suitable guests become available. Goodbye.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO call_settings (voice_gender) VALUES ('man')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE call_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read call settings"
  ON call_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update call settings"
  ON call_settings FOR UPDATE
  USING (auth.role() = 'authenticated');
