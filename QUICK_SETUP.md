# Quick Setup Commands

## 1. Set Twilio Secrets in Supabase

Replace `YOUR_*` with actual values from Twilio Console:

```powershell
# Set Twilio Account SID
supabase secrets set TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID

# Set Twilio Auth Token  
supabase secrets set TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN

# Set Twilio Phone Number
supabase secrets set TWILIO_PHONE_NUMBER=+18452187236
```

## 2. Deploy All Edge Functions

```powershell
supabase functions deploy make-call
supabase functions deploy handle-outbound-response
supabase functions deploy handle-beds-input
supabase functions deploy handle-couple-response
supabase functions deploy handle-mix-response
supabase functions deploy handle-two-couples-response
supabase functions deploy handle-crib-response
```

## 3. Run Database Migrations

```powershell
# Apply all migrations
supabase db push

# Or run individually via Supabase SQL Editor:
# - 20241204_add_call_automation.sql
# - 20241204_add_mix_question.sql
# - 20241204_add_baby_crib_support.sql
# - 20241204_add_call_settings_questions.sql
```

## 4. Verify Setup

Check that secrets are set:
```powershell
supabase secrets list
```

Should show:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

## Troubleshooting

If you get "Twilio credentials not configured":
1. Run `supabase secrets list` to verify secrets exist
2. Redeploy functions after setting secrets
3. Check Supabase Dashboard → Edge Functions → Secrets

If migrations fail:
1. Run them manually in Supabase SQL Editor
2. Check for existing columns before adding
3. Verify table permissions
