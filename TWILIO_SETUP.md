# Twilio Setup Guide for Automated Calling System

## Prerequisites
- Supabase project with Edge Functions enabled
- Twilio account (sign up at https://www.twilio.com)
- Supabase CLI installed

## Step 1: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get your Twilio phone number from **Phone Numbers** section
   - Current number: **+1 845 218 7236**

## Step 2: Set Environment Variables in Supabase

You need to add these secrets to your Supabase Edge Functions:

```bash
# Using Supabase CLI
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+18452187236
```

**OR** via Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Secrets**
3. Add three secrets:
   - Key: `TWILIO_ACCOUNT_SID`, Value: Your Account SID
   - Key: `TWILIO_AUTH_TOKEN`, Value: Your Auth Token
   - Key: `TWILIO_PHONE_NUMBER`, Value: `+18452187236`

## Step 3: Configure Twilio Webhook URLs

After deploying your Edge Functions, you need to configure Twilio to send responses to your endpoints:

1. Go to Twilio Console → **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on your phone number (+1 845 218 7236)
3. Scroll to **Voice Configuration**
4. Set **A Call Comes In** to:
   - Webhook: `https://YOUR_PROJECT.supabase.co/functions/v1/handle-outbound-response`
   - HTTP Method: `POST`
5. Click **Save**

## Step 4: Deploy Edge Functions

Deploy all Edge Functions to Supabase:

```bash
supabase functions deploy make-call
supabase functions deploy handle-outbound-response
supabase functions deploy handle-beds-input
supabase functions deploy handle-couple-response
supabase functions deploy handle-mix-response
supabase functions deploy handle-two-couples-response
supabase functions deploy handle-crib-response
```

## Step 5: Run Database Migrations

Apply all database migrations:

```bash
supabase db push
```

Or manually run the SQL files in order:
1. `20241204_add_call_automation.sql`
2. `20241204_add_mix_question.sql`
3. `20241204_add_baby_crib_support.sql`
4. `20241204_add_call_settings_questions.sql`

## Step 6: Test the System

1. Create an apartment with a valid phone number
2. Go to Settings tab → Automated Calls section
3. Click "Call All in Queue" or individual "Call" buttons
4. Monitor the call history in the UI

## Troubleshooting

### Error: "Twilio credentials not configured"
- Verify secrets are set in Supabase dashboard
- Redeploy Edge Functions after setting secrets
- Check spelling of environment variable names

### Calls not being made
- Verify Twilio phone number is correct
- Check Twilio account balance
- Verify phone numbers are in E.164 format (+country code + number)

### Webhooks not working
- Ensure webhook URL is correct in Twilio console
- Check Edge Function logs for errors
- Verify CORS headers are properly configured

## Important Notes

- All phone numbers must be in **E.164 format**: `+[country code][number]`
- Israeli numbers: `+972` prefix (e.g., `+972501234567`)
- Test with valid phone numbers you control first
- Monitor Twilio usage to avoid unexpected charges
- Twilio trial accounts can only call verified numbers

## Security Best Practices

- Never commit `.env` files with real credentials
- Use Supabase Secrets for production credentials
- Regularly rotate Twilio Auth Token
- Enable IP whitelisting in Twilio if possible
- Monitor call logs for suspicious activity
