# Deploy Edge Functions via Supabase Dashboard

Since Supabase CLI is not installed, you can deploy Edge Functions directly through the Supabase Dashboard.

## ✅ Your Twilio Secrets are Already Configured!

I can see from your screenshot that these are set:
- ✅ `TWILIO_ACCOUNT_SID`
- ✅ `TWILIO_AUTH_TOKEN`
- ✅ `TWILIO_PHONE_NUMBER`

## Deploy Edge Functions via Dashboard

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Deploy new function**
4. For each function, you'll need to:
   - Copy the function code from `supabase/functions/[function-name]/index.ts`
   - Paste into the dashboard editor
   - Click **Deploy**

**Functions to Deploy:**
1. `make-call`
2. `handle-outbound-response`
3. `handle-beds-input`
4. `handle-couple-response`
5. `handle-mix-response`
6. `handle-two-couples-response`
7. `handle-crib-response`

### Option 2: Install Supabase CLI (Recommended for Future)

```powershell
# Install via npm
npm install -g supabase

# Login
supabase login

# Link project (you'll need your project ref)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions at once
supabase functions deploy make-call
supabase functions deploy handle-outbound-response
supabase functions deploy handle-beds-input
supabase functions deploy handle-couple-response
supabase functions deploy handle-mix-response
supabase functions deploy handle-two-couples-response
supabase functions deploy handle-crib-response
```

## Database Migrations

You also need to run the database migrations. Go to **SQL Editor** in Supabase Dashboard and run these files in order:

1. **20241204_add_call_automation.sql**
   - Location: `supabase/migrations/20241204_add_call_automation.sql`
   - Adds: `call_frequency`, `call_priority`, `call_history` table

2. **20241204_add_mix_question.sql**
   - Location: `supabase/migrations/20241204_add_mix_question.sql`
   - Adds: `mix_question` column to `call_settings`

3. **20241204_add_baby_crib_support.sql**
   - Location: `supabase/migrations/20241204_add_baby_crib_support.sql`
   - Adds: `has_baby` to guests, `has_crib` to apartments

4. **20241204_add_call_settings_questions.sql**
   - Location: `supabase/migrations/20241204_add_call_settings_questions.sql`
   - Adds: `crib_question`, `two_couples_question` to `call_settings`

### How to Run Migrations in Dashboard:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Copy content from migration file
4. Paste into editor
5. Click **Run**
6. Repeat for each migration file

## Verify Deployment

After deploying:

1. **Check Edge Functions:**
   - Dashboard → Edge Functions
   - All 7 functions should be listed
   - Check logs for any errors

2. **Check Database:**
   - Dashboard → Table Editor
   - Verify `apartments` has: `phone_number`, `call_frequency`, `call_priority`, `has_crib`
   - Verify `guests` has: `has_baby`
   - Verify `call_settings` table exists with all question columns
   - Verify `call_history` table exists

3. **Test the System:**
   - Create an apartment with a valid phone number
   - Go to Settings tab → Automated Calls
   - Click "Call" on an apartment
   - Monitor the response

## Current Status

✅ **Twilio Secrets Configured** (I can see them in your screenshot)
⏳ **Edge Functions Need Deployment**
⏳ **Database Migrations Need to Run**

## Quick Start (Without CLI)

**Easiest approach right now:**

1. **Run migrations via SQL Editor** (5 minutes)
   - Copy/paste each migration file into SQL Editor
   - Run one by one

2. **For now, test without deploying new functions:**
   - Your existing deployed functions should work with the secrets
   - If `make-call` is already deployed, it will use the Twilio secrets automatically

3. **Deploy new functions via Dashboard** when ready (10-15 minutes)
   - Or install Supabase CLI for easier deployment later

The Twilio credentials are configured correctly - once you deploy/redeploy the Edge Functions, the calling system will work! 📞
