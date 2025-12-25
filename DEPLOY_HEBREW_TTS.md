# Deploy Hebrew Text-to-Speech Support

This guide will help you deploy Hebrew language support for the IVR system.

## Changes Made

### 1. Database Migration
- Added `tts_language` setting to `system_settings` table with default value `he-IL`
- Location: `supabase/migrations/20241208_add_hebrew_language_support.sql`

### 2. Edge Functions Updated
All TwiML `<Say>` tags updated from `voice="man"` to `voice="man" language="he-IL"`:

**Core IVR Functions:**
- ✅ incoming-call (main IVR menu)
- ✅ open-call-system (bed availability system entry)
- ✅ handle-ivr-selection (IVR menu routing)

**Bed System Functions:**
- ✅ handle-host-response (existing host responses)
- ✅ handle-new-host (new host registration)
- ✅ handle-partial-beds (partial bed availability)
- ✅ handle-host-update-beds (bed count updates)
- ✅ handle-host-name-recording (name recording callback)

**Meal System Functions:**
- ✅ handle-meal-call (meal hosting entry)
- ✅ handle-meal-response (meal confirmation responses)

**Admin Functions:**
- ✅ handle-admin-menu (admin menu entry)
- ✅ handle-admin-selection (admin menu routing)
- ✅ handle-admin-beds-action (admin bed management)
- ✅ handle-admin-update-beds (update beds needed)
- ✅ handle-admin-send-calls (trigger automated calls)

**Other Functions:**
- ✅ handle-weekly-calls-preference (weekly call preferences)
- ✅ handle-voicemail (voicemail system)

**Total:** 17 Edge Functions updated with 31+ `<Say>` tags

## Deployment Steps

### Step 1: Apply Database Migration
```powershell
# Run the migration to add Hebrew language setting
supabase migration up --db-url <YOUR_DB_URL>
```

Or manually run in SQL Editor:
```sql
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('tts_language', 'he-IL', 'Text-to-speech language code (he-IL for Hebrew, en-US for English)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
```

### Step 2: Deploy All Edge Functions
```powershell
# Deploy all functions at once
.\deploy-functions.ps1
```

Or deploy individually:
```powershell
supabase functions deploy incoming-call
supabase functions deploy open-call-system
supabase functions deploy handle-ivr-selection
supabase functions deploy handle-meal-call
supabase functions deploy handle-meal-response
supabase functions deploy handle-host-response
supabase functions deploy handle-new-host
supabase functions deploy handle-partial-beds
supabase functions deploy handle-host-update-beds
supabase functions deploy handle-admin-menu
supabase functions deploy handle-admin-selection
supabase functions deploy handle-admin-beds-action
supabase functions deploy handle-admin-update-beds
supabase functions deploy handle-admin-send-calls
supabase functions deploy handle-weekly-calls-preference
supabase functions deploy handle-voicemail
supabase functions deploy handle-host-name-recording
```

### Step 3: Test the Hebrew IVR
1. Call your Twilio number
2. Listen for Hebrew prompts
3. Test bed availability system (press appropriate digit from menu)
4. Test meal hosting system (press appropriate digit from menu)
5. Verify numbers are announced in Hebrew

## Expected Behavior

### Before Deployment:
- IVR prompts in English voice
- Numbers announced in English

### After Deployment:
- IVR prompts in Hebrew voice (`he-IL`)
- Numbers announced in Hebrew
- All digit recognition still works
- Voicemail, admin menu, bed/meal systems all speak Hebrew

## Rollback (if needed)

To revert to English, change all `language="he-IL"` back to remove the language attribute, or set to `language="en-US"`:

```powershell
# Remove language setting from database
DELETE FROM system_settings WHERE setting_key = 'tts_language';
```

Then redeploy functions with English (revert code changes).

## Technical Details

### Twilio Hebrew Support
- Language Code: `he-IL`
- Voice: `man` (male Hebrew voice)
- Supported by Twilio: ✅ Yes
- Digit recognition: ✅ Works with Hebrew prompts

### Audio Settings Compatibility
- Custom MP3 audio (via `<Play>`) still works as-is
- Text-to-speech fallbacks now use Hebrew
- Audio settings table (`bed_audio_settings`, `meal_audio_settings`) unaffected

### System Settings
New setting added:
```
setting_key: tts_language
setting_value: he-IL
description: Text-to-speech language code (he-IL for Hebrew, en-US for English)
```

## Verification Checklist

- [ ] Migration applied successfully
- [ ] All 17 functions deployed
- [ ] Called main IVR number - heard Hebrew greeting
- [ ] Tested bed system - Hebrew prompts
- [ ] Tested meal system - Hebrew prompts
- [ ] Tested admin menu - Hebrew prompts
- [ ] Verified digit recognition works
- [ ] Checked voicemail system
- [ ] Automated calls working with Hebrew

## Support

If you encounter issues:
1. Check function logs in Supabase dashboard
2. Verify Twilio supports `he-IL` language (it does)
3. Ensure all functions redeployed
4. Test with Twilio debugger console

---

**Status:** ✅ Ready to Deploy
**Last Updated:** December 8, 2024
