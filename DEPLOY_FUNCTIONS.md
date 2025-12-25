# Deploy Edge Functions via Supabase Dashboard

Since Supabase CLI installation failed, deploy the functions manually through the dashboard:

## Method 1: Deploy via Supabase Dashboard

### 1. Deploy incoming-call

1. Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. Click **"Create a new function"** or find `incoming-call` if it exists
3. Function name: `incoming-call`
4. Copy the entire content from: `supabase/functions/incoming-call/index.ts`
5. Paste into the code editor
6. Click **"Deploy function"**

### 2. Deploy handle-bed-response

1. Click **"Create a new function"**
2. Function name: `handle-bed-response`
3. Copy the entire content from: `supabase/functions/handle-bed-response/index.ts`
4. Paste into the code editor
5. Click **"Deploy function"**

### 3. Deploy handle-bed-count

1. Click **"Create a new function"**
2. Function name: `handle-bed-count`
3. Copy the entire content from: `supabase/functions/handle-bed-count/index.ts`
4. Paste into the code editor
5. Click **"Deploy function"**

---

## Method 2: Install Supabase CLI via Scoop (Windows)

```powershell
# Install Scoop (if not installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify installation
supabase --version

# Login to Supabase
supabase login

# Link to your project
cd C:\Users\maama\Downloads\skverho
supabase link --project-ref wwopmopxgpdeqxuacagf

# Deploy all functions
supabase functions deploy incoming-call
supabase functions deploy handle-bed-response
supabase functions deploy handle-bed-count
```

---

## Verification After Deployment

### Check Function Logs

Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/logs/functions

Filter by function name to see logs.

### Test the Phone System

1. Call your Twilio number: **+18452187236**
2. Press **1** → Should record full bed availability
3. Call again, press **3** → Enter **5** → Should record 5 beds
4. Call again, press **9** → Should schedule Friday callback

### Check Database

```sql
-- Check responses
SELECT * FROM bed_availability_responses 
ORDER BY created_at DESC LIMIT 5;

-- Check callbacks
SELECT * FROM callback_queue 
WHERE status = 'pending'
ORDER BY scheduled_for;

-- Check current week
SELECT * FROM weekly_bed_needs
ORDER BY week_start_date DESC LIMIT 1;
```

---

## Current Function Files

All three functions are ready in your workspace:

1. **incoming-call** → `c:\Users\maama\Downloads\skverho\supabase\functions\incoming-call\index.ts`
   - Fixed `week_id` extraction (no longer undefined)
   - Uses correct project URL
   - Passes `week_id` and `apartment_id` to next function

2. **handle-bed-response** → `c:\Users\maama\Downloads\skverho\supabase\functions\handle-bed-response\index.ts`
   - Processes digits 1, 2, 3, 9
   - Records responses to database
   - Schedules callbacks

3. **handle-bed-count** → `c:\Users\maama\Downloads\skverho\supabase\functions\handle-bed-count\index.ts`
   - Processes partial bed count (1-9)
   - Validates input
   - Records to database

---

## What Will Work After Deployment

✅ Phone calls will be answered
✅ Greeting: "Hello [Host Name]. Do you have beds available?"
✅ Press 1 → Records full bed availability
✅ Press 2 → Records no beds
✅ Press 3 → Asks "How many beds?" → Records partial count
✅ Press 9 → Schedules Friday callback
✅ Timeout/no input → Schedules callback
✅ Data saves to `bed_availability_responses` and `callback_queue` tables
✅ Week totals auto-update via triggers
✅ Bed Management tab shows available beds, pending guests, callback queue

---

## Recommended: Method 1 (Dashboard)

Use the dashboard method if you want to deploy quickly without installing Scoop. The dashboard editor provides immediate deployment.
