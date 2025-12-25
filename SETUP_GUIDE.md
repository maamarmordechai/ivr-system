# Complete Setup Guide for Twilio Calling System

## Overview
This guide will help you set up a complete calling system using Supabase (free tier) and Twilio for your accommodation management app.

## Prerequisites

1. **Supabase Account** (Free tier)
   - You already have this set up
   - Free tier includes: 500MB database, 2GB bandwidth, 50,000 Edge Function invocations/month

2. **Twilio Account** (Trial)
   - Sign up at https://www.twilio.com/try-twilio
   - You get $15.50 free credit
   - Calls cost ~$0.013-0.025 per minute
   - Trial accounts can only call verified numbers

## Step 1: Set Up Twilio

### 1.1 Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up with your email
3. Verify your phone number
4. Complete the onboarding

### 1.2 Get Twilio Credentials
1. Go to Twilio Console: https://console.twilio.com/
2. Find these values on the dashboard:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
3. Get a phone number:
   - Go to Phone Numbers → Manage → Buy a number
   - Select a number (free trial includes one number)

### 1.3 Verify Phone Numbers (Trial Only)
For trial accounts, you must verify numbers before calling them:
1. Go to Phone Numbers → Manage → Verified Caller IDs
2. Click the red "+" button
3. Enter the phone number you want to call
4. Verify via SMS or call

## Step 2: Install Supabase CLI

Open PowerShell and run:

```powershell
npm install -g supabase
```

## Step 3: Link Your Supabase Project

### 3.1 Login to Supabase
```powershell
supabase login
```

### 3.2 Get Your Project Reference
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID"

### 3.3 Link the Project
```powershell
cd c:\Users\maama\Downloads\skverho
supabase link --project-ref YOUR_PROJECT_REF
```

## Step 4: Set Up Environment Variables

Set your Twilio credentials as Supabase secrets:

```powershell
supabase secrets set TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID
supabase secrets set TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN
supabase secrets set TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER
```

Replace:
- `YOUR_ACCOUNT_SID` with your actual Account SID (e.g., ACxxxxx...)
- `YOUR_AUTH_TOKEN` with your actual Auth Token
- `YOUR_TWILIO_PHONE_NUMBER` with your Twilio number in E.164 format (e.g., +12345678900)

## Step 5: Update Database Schema

Run the migration to add phone number support:

```powershell
supabase db push
```

Or manually run the SQL in your Supabase SQL Editor:
1. Go to your Supabase dashboard
2. Click "SQL Editor"
3. Copy the contents of `supabase/migrations/20241203_add_phone_and_call_tracking.sql`
4. Paste and run

## Step 6: Deploy Edge Functions

Deploy both Edge Functions:

```powershell
# Deploy the make-call function
supabase functions deploy make-call

# Deploy the handle-call-response function
supabase functions deploy handle-call-response
```

## Step 7: Add Phone Numbers to Apartments

You need to add phone numbers to your apartments. You can do this via SQL:

```sql
-- Example: Update apartment phone numbers
UPDATE apartments 
SET phone_number = '+1234567890'  -- Use E.164 format
WHERE person_name = 'John Doe';
```

Or create a UI to add/edit phone numbers in your Settings tab.

## Step 8: Test the System

### 8.1 Test Locally (Optional)
```powershell
supabase functions serve
```

Then in another terminal:
```powershell
curl -X POST http://localhost:54321/functions/v1/make-call `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -d '{"to": "+1234567890", "guestName": "Test", "apartmentNumber": "101"}'
```

### 8.2 Test from Your App
1. Start your development server: `npm run dev`
2. Login to your app
3. Click on the call system button
4. Select an apartment with a phone number
5. Click "Make Call"

## Step 9: Monitor Calls

### In Twilio Console
1. Go to Monitor → Logs → Calls
2. See all call attempts, statuses, and recordings

### In Your Database
Query the call history:
```sql
SELECT * FROM call_history 
ORDER BY created_at DESC;
```

## Troubleshooting

### Error: "Twilio credentials not configured"
- Make sure you ran the `supabase secrets set` commands
- Redeploy the functions after setting secrets

### Error: "The number is unverified"
- In trial mode, verify the destination number in Twilio console
- Or upgrade to a paid Twilio account (no verification needed)

### Error: "Failed to make call"
- Check that phone numbers are in E.164 format (+1234567890)
- Verify Twilio account has credit
- Check Supabase function logs: `supabase functions logs make-call`

### CORS Errors
- The functions already include CORS headers
- Make sure you're calling from your app's domain
- Check browser console for specific CORS issues

## Cost Estimation

### Twilio Costs (after free credit)
- Outgoing calls: ~$0.013-0.025 per minute
- Phone number rental: ~$1.15/month
- With $15.50 credit, you can make ~600-1200 minutes of calls

### Supabase Free Tier
- 500MB database storage
- 2GB bandwidth
- 50,000 Edge Function invocations/month
- Unlimited API requests

## Upgrading to Production

When ready for production:

1. **Upgrade Twilio** (remove trial restrictions)
   - Go to Billing → Upgrade
   - Add payment method
   - No more number verification needed

2. **Add Security**
   - Implement Row Level Security (RLS) in Supabase
   - Add authentication checks in Edge Functions
   - Rate limit calls to prevent abuse

3. **Add Call Recording** (optional)
   - Modify TwiML to include `<Record>`
   - Store recordings in Supabase Storage

4. **Add SMS Notifications**
   - Create another Edge Function for SMS
   - Send SMS after failed calls

## Additional Features to Consider

- **Call scheduling**: Schedule calls for specific times
- **Automated callbacks**: Auto-retry failed calls
- **Call analytics**: Track response rates, call duration
- **Voicemail detection**: Detect and leave voicemail
- **Multi-language support**: Different languages per apartment

## Support Resources

- Twilio Documentation: https://www.twilio.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Twilio TwiML: https://www.twilio.com/docs/voice/twiml

## Need Help?

Check the logs:
```powershell
# View Edge Function logs
supabase functions logs make-call

# View all function logs
supabase functions logs
```
