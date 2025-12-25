# Troubleshooting Guide

## Error: "Twilio credentials not configured"

**Cause:** The Supabase Edge Functions need Twilio API credentials to make phone calls.

**Solution:**

### Option 1: Using Supabase CLI (Recommended)

```powershell
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set the secrets
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+18452187236

# Redeploy functions
supabase functions deploy make-call
```

### Option 2: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** → **Manage secrets**
4. Add three secrets:
   - `TWILIO_ACCOUNT_SID`: Your Account SID from Twilio Console
   - `TWILIO_AUTH_TOKEN`: Your Auth Token from Twilio Console  
   - `TWILIO_PHONE_NUMBER`: `+18452187236`
5. Redeploy all Edge Functions

### Where to find Twilio credentials:

1. Go to https://console.twilio.com
2. Your **Account SID** and **Auth Token** are on the main dashboard
3. Your phone number is under **Phone Numbers** → **Manage** → **Active numbers**

---

## Error: "HebrewCalendar.daysInMonth is not a function"

**Cause:** The `@hebcal/core` library doesn't have a static `daysInMonth` method on `HebrewCalendar`.

**Solution:** Already fixed! The `HebrewDatePicker.jsx` now uses a try-catch approach to determine if a Hebrew month has 29 or 30 days.

If you still see this error:
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Restart the dev server: `npm run dev`
3. Hard refresh the page (Ctrl+Shift+R)

---

## Error: "Invalid value for prop `dismiss` on <li> tag"

**Cause:** React warning about passing object prop to DOM element.

**Impact:** Cosmetic warning only, doesn't affect functionality.

**Solution:** Can be ignored, or fix by updating the Toast component to not pass the `dismiss` prop directly to the DOM element.

---

## Other Common Issues

### Calls not connecting
- Verify phone numbers are in E.164 format: `+[country code][number]`
- Israeli numbers: `+972501234567`
- US numbers: `+18452187236`
- Check Twilio account has sufficient balance
- Verify Twilio phone number is active

### Database errors
- Run migrations in order:
  1. `20241204_add_call_automation.sql`
  2. `20241204_add_mix_question.sql`
  3. `20241204_add_baby_crib_support.sql`
  4. `20241204_add_call_settings_questions.sql`
- Use Supabase SQL Editor if `supabase db push` fails
- Check table permissions in RLS policies

### Edge Functions not deploying
```powershell
# Check Supabase CLI version
supabase --version

# Update if needed
npm install -g supabase@latest

# Verify project link
supabase status

# Deploy with verbose logging
supabase functions deploy make-call --debug
```

---

## Quick Health Check

Run this checklist:

- [ ] Twilio credentials set in Supabase secrets
- [ ] All Edge Functions deployed
- [ ] Database migrations applied
- [ ] Phone numbers in E.164 format
- [ ] Twilio webhook URL configured
- [ ] Call settings initialized in database
- [ ] Browser cache cleared after code changes

---

## Getting Help

If issues persist:

1. Check Supabase Edge Function logs:
   - Dashboard → Edge Functions → Select function → Logs

2. Check Twilio logs:
   - https://console.twilio.com/monitor/logs/calls

3. Check browser console for JavaScript errors (F12)

4. Verify database schema:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'apartments';
   ```
