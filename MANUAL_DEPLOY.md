# Manual Deployment Instructions

## Option 1: Using Supabase Dashboard (Recommended)

### Deploy handle-weekly-availability
1. Go to https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. Find `handle-weekly-availability` function
3. Click on it
4. Click **"Deploy new version"** or **"Edit"**
5. Copy entire content from: `supabase/functions/handle-weekly-availability/index.ts`
6. Paste into editor
7. Click **"Deploy"**

### Deploy batch-weekly-calls (NEW)
1. Go to https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. Click **"Create a new function"**
3. Name: `batch-weekly-calls`
4. Copy entire content from: `supabase/functions/batch-weekly-calls/index.ts`
5. Paste into editor
6. Click **"Create function"** or **"Deploy"**

## Option 2: Install Supabase CLI and Deploy

### Install Supabase CLI
```powershell
npm install -g supabase
```

### Login to Supabase
```powershell
supabase login
```

### Deploy Functions
```powershell
# Deploy updated weekly availability
supabase functions deploy handle-weekly-availability --project-ref wwopmopxgpdeqxuacagf

# Deploy new batch calling function
supabase functions deploy batch-weekly-calls --project-ref wwopmopxgpdeqxuacagf
```

## What Changed

### handle-weekly-availability
- **Barge-in enabled**: Users can press digits during audio playback
- **Better logging**: Debug output for response saving issues
- **Error handling**: Better error messages for troubleshooting

### batch-weekly-calls (NEW)
- Processes Excel contact list
- Makes outbound weekly availability calls
- Returns success/failure stats

## Verify Deployment

1. **Check Functions Page**: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. You should see both functions listed
3. Test by:
   - Making a test call (barge-in should work)
   - Uploading a small Excel file with 1-2 test contacts

## Environment Variables Required

Both functions need these Twilio variables (should already be set):
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
