# Quick Setup for Twilio Calling

## Current Status ✅
- ✅ Database schema updated (phone_number, call tracking)
- ✅ React component updated with calling UI
- ✅ Supabase connected

## Next Steps for Twilio Integration

### 1. Deploy Edge Functions

Run these commands in your terminal:

```powershell
# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref wwopmopxgpdeqxuacagf

# Deploy the Edge Functions
supabase functions deploy make-call
supabase functions deploy handle-call-response
```

### 2. Add Twilio Credentials

Once you have your Twilio account ready:

```powershell
# Set your Twilio credentials as Supabase secrets
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=your_twilio_number_here
```

### 3. Add Phone Numbers to Test

For now, you can add test phone numbers to your apartments table:

```sql
-- Run this in Supabase SQL Editor
UPDATE apartments 
SET phone_number = '+1234567890'  -- Replace with a real number in E.164 format
WHERE id = 1;  -- Replace with actual apartment ID
```

### 4. Test the System

1. Start your dev server (already running): `npm run dev`
2. Open your app in the browser
3. Login and go to the Call System
4. Click "Make Call" on an apartment with a phone number

## For Later (When You Get Twilio)

1. **Sign up**: https://www.twilio.com/try-twilio
2. **Get credentials**:
   - Account SID (starts with AC...)
   - Auth Token (click to reveal)
   - Phone Number (get one free with trial)
3. **Verify test numbers** (trial requirement):
   - Go to Phone Numbers → Verified Caller IDs
   - Add the phone numbers you want to test with
4. **Set secrets** (commands above)
5. **Redeploy functions**: `supabase functions deploy make-call`

## Testing Without Twilio (For Now)

The calling button will be visible in your UI, but calls won't work until Twilio is configured. You can:
- Test the UI flow
- See the call script
- Test manual response recording (buttons 1-4)
- View call history in the database

## Quick Verification Checklist

- [ ] Database has `phone_number` column in apartments table
- [ ] Database has `call_sid`, `call_status`, `call_duration` in call_history table
- [ ] Dev server is running (`npm run dev`)
- [ ] Can see Call System in the UI
- [ ] "Make Call" button appears when viewing an apartment
- [ ] Ready to deploy Edge Functions when Twilio is ready

## Need Help?

If you want to test the Edge Functions locally before deploying:

```powershell
# Start local Supabase (includes Edge Functions runtime)
supabase start

# Serve functions locally
supabase functions serve
```

Then update your app to point to local functions during development.
