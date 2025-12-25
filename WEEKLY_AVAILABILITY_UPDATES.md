# Weekly Availability Updates - Deployment Guide

## Changes Made

### 1. **Barge-In Feature** ✅
   - Callers can now press buttons DURING audio playback
   - No need to wait for recordings to finish
   - Modified `handle-weekly-availability/index.ts`:
     - Moved `<Play>` tags INSIDE `<Gather>` tags
     - Added `finishOnKey=""` to allow any key press to interrupt

### 2. **Response Recording Debug** ✅
   - Added comprehensive logging for Friday callback and No responses
   - Added error handling to capture database insert failures
   - Will help diagnose why responses aren't being saved
   - Check Supabase logs after calls to see debug output

### 3. **Excel Batch Calling** ✅
   - Upload Excel file (.xlsx or .xls)
   - Column A = Contact Name
   - Column B = Phone Number
   - Automatically triggers weekly availability calls to all contacts
   - Shows success/failure count
   - UI only enabled when Weekly Mode is active

## Deployment Steps

### Step 1: Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/20241215_make_apartment_optional.sql
```
This adds an index for phone number lookups and documents that apartment_id is optional.

### Step 2: Deploy Edge Functions
**Option A - Manual (Dashboard):**
1. Go to https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. Update `handle-weekly-availability` (copy from `supabase/functions/handle-weekly-availability/index.ts`)
3. Create `batch-weekly-calls` (copy from `supabase/functions/batch-weekly-calls/index.ts`)

**Option B - CLI:**
```powershell
# Deploy updated weekly availability handler
npx supabase functions deploy handle-weekly-availability --project-ref wwopmopxgpdeqxuacagf

# Deploy new batch calling function
npx supabase functions deploy batch-weekly-calls --project-ref wwopmopxgpdeqxuacagf
```

### Step 3: Verify Changes
1. **Test Barge-In**: Call your system and try pressing 1, 2, or 3 during the audio playback
2. **Check Logging**: After calls, check Supabase dashboard > Edge Functions > Logs to see debug output
3. **Test Excel Upload**: 
   - Enable Weekly Mode
   - Upload sample Excel with 2-3 test contacts
   - Verify calls are initiated

### Step 3: Create Sample Excel File
Create a test file with this format:

| Column A (Name) | Column B (Phone) |
|----------------|------------------|
| John Doe       | +12125551234     |
| Jane Smith     | +13105555678     |
| David Cohen    | +17185559999     |

- Phone numbers can include or exclude the + prefix
- System will auto-add +1 for US numbers if no country code

## Testing Checklist

- [ ] Barge-in works during availability question audio
- [ ] Barge-in works during beds question audio
- [ ] Friday callback responses appear in Weekly Availability tab
- [ ] No responses appear in Weekly Availability tab
- [ ] Excel upload validates file format
- [ ] Excel upload shows contact count confirmation
- [ ] Batch calls initiated successfully
- [ ] Responses from batch calls appear in system

## Troubleshooting

### Barge-In Not Working
- Redeploy `handle-weekly-availability` function
- Clear browser cache and refresh

### Responses Not Saving
- Check Supabase logs for error messages:
  - "Cannot save friday_callback - missing weekId"
  - "Error inserting friday_callback:"
- Ensure current week exists in `desperate_weeks` table (auto-created if missing)
- **NEW**: Responses now save even without apartment record (for Excel batch calls)
- Phone numbers not in apartments database will save with `apartment_id = NULL`
- Check Weekly Check tab - responses should appear with phone number even if not a registered host

### Excel Upload Fails
- Verify file format (.xlsx or .xls)
- Check that Column A has names and Column B has phone numbers
- Ensure phone numbers contain at least some digits
- Weekly Mode must be enabled first

### Batch Calls Not Initiated
- Check browser console for errors
- Verify `batch-weekly-calls` function is deployed
- Check Twilio account has sufficient balance
- Verify TWILIO_PHONE_NUMBER environment variable is set

## Next Steps

1. **Run migrations** (if not already done):
   ```sql
   -- In Supabase SQL Editor
   -- Run: 20241215_add_voicemail_label.sql
   -- Run: 20241215_add_audio_url_column.sql
   ```

2. **Label your voicemails**:
   - Go to Voicemails tab
   - Click "Label" button on each voicemail
   - Add descriptive labels like "Availability Question", "Thank You Message"

3. **Configure audio prompts**:
   - Go to Weekly Check tab
   - Scroll to Audio Prompts section
   - Select labeled voicemails OR upload converted MP3 files

4. **Test batch calling**:
   - Create Excel with 2-3 test numbers (your own phones)
   - Enable Weekly Mode
   - Upload Excel
   - Confirm calls are received
