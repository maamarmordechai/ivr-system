# Quick Deployment Checklist

## Step 1: Run Database Migration ✓
```
Go to Supabase Dashboard → SQL Editor → New Query
Copy contents of: 20241209_add_call_frequency_and_busy_shabbos.sql
Run it
```

## Step 2: Update IVR Menu ✓
```
In SQL Editor, run: UPDATE_IVR_MENU_ALL_FUNCTIONS.sql
This adds all functions to the IVR menu dropdown
```

## Step 3: Deploy Updated register-host Function ✓
```
Supabase Dashboard → Edge Functions → register-host
Update with current index.ts code
Deploy
```

## Step 4: Deploy trigger-busy-campaign Function ✓
```
Supabase Dashboard → Edge Functions → Create New Function
Name: trigger-busy-campaign
Paste code from: supabase/functions/trigger-busy-campaign/index.ts
Deploy
```

## Step 5: Test Everything ✓

### Test 1: Host Registration
1. Call your Twilio number
2. Press 2 (register as host)
3. Enter bed count (e.g., 3)
4. Record your name
5. **NEW**: Choose frequency:
   - Press 1 for weekly
   - Press 2 for bi-weekly
   - Press 3 for monthly
   - Press 4 for busy weeks only
6. Answer private entrance (1=yes, 2=no)
7. Should complete successfully!

### Test 2: View Who Will Be Called
```sql
-- See who should be called this week
SELECT * FROM get_apartments_to_call(CURRENT_DATE);

-- See campaign overview
SELECT * FROM call_campaign_overview;
```

### Test 3: Trigger Busy Campaign (Admin)
1. Call system
2. Press 6 (or configured admin digit)
3. Press 1 to confirm
4. Should say "Campaign triggered, X hosts will be called"

## Verification Queries

### Check apartment call frequencies
```sql
SELECT 
  person_name,
  phone_number,
  call_frequency,
  last_called_date
FROM apartments
WHERE phone_number IS NOT NULL
ORDER BY call_frequency, person_name;
```

### Check busy weeks
```sql
SELECT 
  week_start_date,
  week_end_date,
  is_desperate,
  triggered_at,
  triggered_by,
  calls_made
FROM desperate_weeks
ORDER BY week_start_date DESC;
```

### Test calling logic
```sql
-- Test for a specific apartment
SELECT should_call_apartment(
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with real apartment ID
  CURRENT_DATE
);

-- See all apartments to call for next Friday
SELECT * FROM get_apartments_to_call(CURRENT_DATE + 5);
```

## Troubleshooting

### Issue: Function not showing in dropdown
**Solution**: Re-run UPDATE_IVR_MENU_ALL_FUNCTIONS.sql

### Issue: Call frequency validation error
**Solution**: Run the migration again, it updates the constraint

### Issue: Trigger function returns error
**Solution**: Check that desperate_weeks table has new columns (triggered_at, triggered_by, calls_made)

### Issue: Registration still asks old weekly question
**Solution**: Redeploy register-host function with updated code

## What Changed

### Before
- Only 2 options: weekly or manual
- No busy week handling
- Functions not in menu dropdown

### After
- 4 frequency options: weekly, bi-weekly, monthly, desperate-only
- Automatic busy week calling (overrides normal schedule)
- Admin can trigger busy week campaign via phone
- All functions visible in IVR menu builder
- Helper functions for calling logic
- Dashboard view for campaign management

## Next Steps

1. ✓ Deploy all changes
2. ✓ Test registration flow
3. ✓ Test admin trigger
4. Add more functions to menu as needed
5. Set up automatic busy week detection (future)
6. Create web admin panel for campaign management (future)
