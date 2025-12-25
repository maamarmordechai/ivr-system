# Complete IVR (Incoming Call) Setup Guide

## What You've Built

An Interactive Voice Response (IVR) system that handles incoming calls with:
- **Main Menu**: Guest registration, Host registration, Check availability
- **Automated Assignment**: Checks database for pending guests and assigns them
- **Smart Matching**: Asks about beds available and couple preferences
- **Real-time Tracking**: All calls logged in database with full details

## Part 1: Run the Database Migration

### Option A: Via Supabase Dashboard (Recommended)
1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **"New query"**
5. Copy the contents of `supabase/migrations/20241203_add_incoming_calls.sql`
6. Paste into the editor
7. Click **Run** or press `Ctrl+Enter`
8. You should see: "Success. No rows returned"

### Option B: Via SQL Editor Directly
1. Open the file: `supabase/migrations/20241203_add_incoming_calls.sql`
2. Copy all the SQL
3. Run it in your Supabase SQL Editor

## Part 2: Deploy the Edge Functions

You have 4 new Edge Functions to deploy. Since you're using the database directly:

### In Supabase Dashboard:

1. Go to **Edge Functions** in the left sidebar
2. Click **"Create a new function"**

#### Function 1: incoming-call
- Name: `incoming-call`
- Copy code from: `supabase/functions/incoming-call/index.ts`
- Paste and click **Deploy**

#### Function 2: handle-menu-selection
- Name: `handle-menu-selection`
- Copy code from: `supabase/functions/handle-menu-selection/index.ts`
- Paste and click **Deploy**

#### Function 3: handle-beds-input
- Name: `handle-beds-input`
- Copy code from: `supabase/functions/handle-beds-input/index.ts`
- Paste and click **Deploy**

#### Function 4: handle-couple-response
- Name: `handle-couple-response`
- Copy code from: `supabase/functions/handle-couple-response/index.ts`
- Paste and click **Deploy**

### Add Required Environment Variables

These functions need access to your Supabase URL and service key:

1. Go to **Project Settings** → **API**
2. Copy your **Project URL** and **service_role key** (NOT anon key)
3. Go to **Edge Functions** → **Secrets**
4. Add these secrets:
   - Name: `SUPABASE_URL` 
     Value: (your Project URL)
   - Name: `SUPABASE_SERVICE_ROLE_KEY` 
     Value: (your service_role key - click "Reveal" to see it)

## Part 3: Configure Twilio for Incoming Calls

### Step 1: Get Your Edge Function URL
1. Go to **Edge Functions** in Supabase
2. Click on **incoming-call** function
3. Copy the URL (looks like: `https://wwopmopxgpdeqxuacagf.supabase.co/functions/v1/incoming-call`)

### Step 2: Configure Twilio Phone Number
1. Go to **Twilio Console**: https://console.twilio.com
2. Click **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number (+1 845 218 7236)
4. Scroll down to **Voice Configuration**
5. Under **A CALL COMES IN**:
   - Change dropdown to **Webhook**
   - Paste your Edge Function URL
   - Set HTTP method to **POST**
6. Click **Save** at the bottom

### Step 3: Test the System

**Call your Twilio number from your phone**: +1 845 218 7236

You should hear:
> "Welcome to Accommodation Management System.
> Press 1 to register as a guest.
> Press 2 to register as a host.
> Press 3 to check if there are any assignments waiting for this week."

#### Testing Option 3 (Check Availability):

**Prerequisites:**
1. Your phone number must be in the `apartments` table as a registered host
2. There should be some guests without apartments in the `guests` table

**Flow:**
1. Call the number
2. Press **3**
3. System checks if your phone number is registered
4. If yes, tells you how many guests are waiting
5. Asks: "How many beds do you have available?"
6. You enter a number (1-9)
7. System asks: "Can you accept a couple? Press 1 for yes, 2 for no"
8. You press 1 or 2
9. System automatically assigns guests to your apartment
10. Thanks you and hangs up

## Part 4: View Call Logs in Your App

The new **"Calls"** tab in your app shows:
- All incoming calls
- What menu option they selected
- How many beds they offered
- Whether they accept couples
- How many guests were assigned
- Call status

### To Access:
1. Open http://localhost:3001
2. Login
3. Click the **"Calls"** tab in the navigation
4. See real-time incoming call data with stats

## Part 5: Prepare Test Data

### Add Test Apartment with Your Phone
```sql
-- Update an existing apartment or insert new one
UPDATE apartments 
SET phone_number = '+1YOUR_PHONE_HERE'  -- Your actual phone in E.164 format
WHERE id = 1;  -- Or your apartment ID

-- Or create a new test apartment
INSERT INTO apartments (person_name, address, phone_number, number_of_beds, is_family_friendly)
VALUES ('Test Host', '123 Test St', '+1YOUR_PHONE', 3, false);
```

### Add Test Guests
```sql
-- Add some pending guests (no apartment assigned)
INSERT INTO guests (name, phone_number, email, is_couple, check_in_date, check_out_date, apartment_id)
VALUES 
  ('John Doe', '+15551234567', 'john@example.com', false, CURRENT_DATE, CURRENT_DATE + 7, NULL),
  ('Jane Smith', '+15551234568', 'jane@example.com', false, CURRENT_DATE, CURRENT_DATE + 5, NULL),
  ('Bob & Alice', '+15551234569', 'couple@example.com', true, CURRENT_DATE, CURRENT_DATE + 10, NULL);
```

## Part 6: Complete Test Flow

### Test Scenario: Host Calls to Offer Beds

1. **Setup**:
   - Make sure your phone number is in `apartments` table
   - Add 2-3 unassigned guests to `guests` table
   - Note the apartment ID

2. **Call**:
   - Call +1 845 218 7236 from the phone number in the database
   - Press **3** (Check availability)

3. **Expected**:
   - "Hello [Your Name]"
   - "There are X guests waiting for accommodation this week"
   - "How many beds do you have available?"
   - Enter **3** (for example)
   - "Can you accept a couple? Press 1 for yes, 2 for no"
   - Press **1** or **2**
   - System assigns guests automatically
   - "We have assigned X guests to your apartment"
   - "You will receive details via email shortly"
   - "Thank you for your hospitality. Goodbye"

4. **Verify**:
   - Go to your app → **Calls** tab
   - See the call logged with all details
   - Go to **Guests** tab
   - See guests now assigned to your apartment

## Troubleshooting

### "We could not find your phone number in our system"
- Your phone number must be in the `apartments` table
- Must be in E.164 format (+1234567890)
- Must match exactly

### "There are currently no guests waiting"
- Add unassigned guests to the `guests` table
- Make sure `apartment_id` is NULL
- Make sure dates are current or future

### Call doesn't connect
- Check Twilio webhook is configured correctly
- Check Edge Function URL is correct
- Check Twilio account has credit
- Look at Twilio logs: Console → Monitor → Logs → Calls

### Functions not working
- Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets are set
- Check Edge Function logs in Supabase Dashboard
- Make sure all 4 functions are deployed

### Guests not assigned
- Check database has `is_couple` column in `guests` table
- Check `incoming_calls` table exists
- View logs in Supabase Edge Functions

## Features Summary

### Main Menu Options:
1. **Guest Registration** - Placeholder for future feature
2. **Host Registration** - Placeholder for future feature  
3. **Check Availability** - Full featured:
   - Verifies caller is registered host
   - Checks for pending guests
   - Asks for beds available
   - Asks about couple preferences
   - Automatically assigns guests
   - Prioritizes couples if accepted
   - Fills remaining beds with individuals
   - Logs everything to database

### Database Tracking:
- Every call is logged with full details
- See who called, when, what they selected
- Track beds offered and couple acceptance
- Count guests assigned per call
- Real-time updates in UI

### Smart Assignment Logic:
- If host accepts couples + has ≥2 beds: tries to assign couple first
- Then fills remaining beds with individuals
- Respects bed capacity
- Only assigns guests checking in within 1 week
- Updates guest records immediately

## Next Steps

1. **Email Notifications**: Add email sending when guests are assigned
2. **SMS Confirmations**: Send SMS to guests with host details
3. **Callback System**: Allow guests to request callbacks
4. **Multi-language**: Add Hebrew/other language support
5. **Advanced Matching**: Consider location, preferences, etc.

## Your Twilio Number

**Phone**: +1 845 218 7236

This number is now configured to:
- Answer all incoming calls
- Run the IVR menu
- Automatically assign guests
- Log everything to your database

Test it by calling from any phone!
