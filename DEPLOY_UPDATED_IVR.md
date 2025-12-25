# Deploying Updated IVR Functions

## Step 1: Run the Database Migration

Open Supabase Dashboard → SQL Editor and run this migration:

```sql
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
```

## Step 2: Deploy Edge Functions

Run this PowerShell command:

```powershell
cd C:\Users\maama\Downloads\skverho
.\deploy-functions.ps1
```

This will deploy all 4 IVR functions:
- incoming-call
- handle-menu-selection
- handle-beds-input
- handle-couple-response

## Step 3: Turn OFF JWT Verification

**CRITICAL:** You must disable JWT verification for all 4 functions:

1. Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. For **each** of these functions:
   - incoming-call
   - handle-menu-selection
   - handle-beds-input
   - handle-couple-response
3. Click the function name
4. Click the "Details" tab
5. Scroll to "Function Configuration" section on the right
6. Find the toggle: **"Verify JWT with legacy secret"**
7. Click to turn it **OFF** (it should turn gray)
8. Click **"Save changes"** button

## Step 4: Test the System

Call your Twilio number: **+1 845 218 7236**

Expected flow:
1. You hear welcome message with male voice
2. Press 3 to check availability
3. System finds your apartment by caller ID (+18453762437)
4. System tells you how many guests are waiting
5. Enter number of beds available (1-9)
6. System asks if you accept couples (press 1 or 2)
7. System assigns guests and confirms

## Step 5: Customize Settings

1. Open your app in browser: http://localhost:3001
2. Go to **Settings** tab
3. Click **Call Settings** sub-tab
4. Customize:
   - Voice gender (man/woman/alice)
   - Welcome message
   - Menu options text
   - All response messages
5. Click **Save Settings**
6. Call again to hear your changes!

## Troubleshooting

### Still getting 401 errors?
- Double-check JWT verification is OFF for ALL 4 functions
- Make sure you clicked "Save changes" after toggling each one
- Wait 30 seconds for changes to propagate
- Try calling again

### Call disconnects immediately?
- Check Supabase Function Logs for errors
- Verify all secrets are still set (especially SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
- Make sure call_settings table was created successfully

### Voice still says "alice" instead of "man"?
- Go to Settings → Call Settings in your app
- Change voice_gender to "man"
- Save
- Try calling again
- If still not working, run the migration again to ensure default value is "man"

## What Changed

✅ Fixed URL issue - now uses hardcoded Supabase project URL instead of dynamic host header
✅ Changed default voice from "alice" to "man" 
✅ Added customizable settings for ALL messages
✅ Created Call Settings UI in Settings tab
✅ Simplified messages - removed excessive pauses
✅ All Edge Functions now fetch settings from database on each call

## Available Voice Options

- `man` - Male voice (default)
- `woman` - Female voice
- `alice` - Polly/AWS female voice (original default)

Try different voices in Settings → Call Settings!
