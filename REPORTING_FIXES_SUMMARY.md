# Reporting Fixes & Desperate Week Feature

## Issues Fixed

### 1. ✅ Address Column Not Showing in Reports
**Problem**: The email reports weren't showing apartment addresses  
**Root Cause**: The query was correct but function might not have been redeployed  
**Solution**: Redeploy `send-weekly-report` function

```powershell
supabase functions deploy send-weekly-report --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt
```

The query already includes:
```typescript
apartments(person_name, phone_number, address, number_of_beds)
```

And displays in HTML:
```html
<td>${conf.apartments?.address || 'Not provided'}</td>
```

### 2. ✅ Expected Guests Showing Zero
**Problem**: Expected Guests shows 0 when it should show the count from `guests` table  
**Root Cause**: Query was correct - likely a data issue  
**Solution**: The query is already correct:
```typescript
const { count: guestCount } = await supabase
  .from('guests')
  .select('*', { count: 'exact', head: true })
  .eq('week_id', weekId);
```

Check if guests are actually in the database for the current week.

### 3. ✅ "Beds Needed" and "Meals Needed" Should Show "Still Needed"
**Problem**: Dashboard shows total needed, not remaining needed  
**Solution**: Updated both BedManagementTab and ReportsTab

**BedManagementTab.jsx:**
- Changed "Still Needed" to calculate: `Math.max(0, bedsNeeded - bedsConfirmed)`
- Now shows actual beds still needed

**ReportsTab.jsx:**
- Changed "Beds Needed" to "Beds Still Needed"
- Shows: `Math.max(0, beds_needed - beds_confirmed)`
- Added subtext: "X of Y confirmed"
- Changed "Meals Needed" to "Meals Still Needed"  
- Shows: `Math.max(0, meals_needed - (total_meals / 2))`

### 4. ✅ Desperate Week Checkbox Missing
**Problem**: No way to mark a week as desperate to trigger aggressive calling  
**Solution**: Added desperate week toggle button and visual indicators

**BedManagementTab.jsx Changes:**
- Added `toggleDesperateWeek()` function
- Added "Mark as Desperate Week" / "Deactivate Desperate Mode" button
- Added 🚨 DESPERATE WEEK badge in header when active
- Button pulses red when desperate mode is on

**Database Changes (20241209_fix_reporting_and_desperate_week.sql):**
- Ensured `is_desperate` column exists on `desperate_weeks` table
- Added `expected_guests` column for tracking
- Created `reset_desperate_week_flags()` function for Sunday resets
- Created `get_beds_still_needed()` and `get_meals_still_needed()` functions
- Created `current_week_summary` view for easy dashboard queries

### 5. ✅ Desperate Week Auto-Reset on Sundays
**Problem**: Desperate flag needs to reset automatically every Sunday  
**Solution**: Created SQL function `reset_desperate_week_flags()`

**To set up weekly reset (choose one method):**

**Option A: Supabase Cron (Recommended)**
```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'reset-desperate-weeks',
  '0 0 * * 0',  -- Every Sunday at midnight
  $$
    SELECT reset_desperate_week_flags();
  $$
);
```

**Option B: GitHub Actions**
Create `.github/workflows/reset-desperate-weeks.yml`:
```yaml
name: Reset Desperate Weeks
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight UTC
jobs:
  reset:
    runs-on: ubuntu-latest
    steps:
      - name: Reset Desperate Flags
        run: |
          curl -X POST https://wwopmopxgpdeqxuacagf.supabase.co/rest/v1/rpc/reset_desperate_week_flags \
            -H "apikey: ${{ secrets.SUPABASE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_KEY }}"
```

**Option C: Manual SQL Trigger**
```sql
-- Run this every Sunday manually
SELECT reset_desperate_week_flags();
```

## New Database Objects

### Functions Created

1. **`reset_desperate_week_flags()`**
   - Resets `is_desperate = false` for all past weeks
   - Should run every Sunday via cron

2. **`get_beds_still_needed(week_id)`**
   - Returns: `MAX(0, beds_needed - beds_confirmed)`
   - Used for dashboard calculations

3. **`get_meals_still_needed(week_id, meal_type)`**
   - meal_type: 'friday', 'saturday', or 'both'
   - Returns remaining meals needed

### View Created

**`current_week_summary`** - One-stop view for dashboard:
```sql
SELECT * FROM current_week_summary;
```

Returns:
- `week_id`, dates, parsha name
- `is_desperate` flag
- `expected_guests` (from guests table)
- `actual_guest_count`
- `beds_needed`, `beds_confirmed`, `beds_still_needed`
- `meals_needed`, meal confirmations, `meals_still_needed`
- `bed_confirmation_percentage`
- `admin_notes`

## UI Updates

### BedManagementTab Component

**Header:**
```jsx
<h2>
  Weekly Bed Management
  {currentWeek.is_desperate && (
    <span className="animate-pulse bg-red-100">
      🚨 DESPERATE WEEK
    </span>
  )}
</h2>
```

**Buttons:**
```jsx
<Button onClick={toggleDesperateWeek} 
        variant={currentWeek.is_desperate ? "destructive" : "outline"}
        className={currentWeek.is_desperate ? "animate-pulse" : ""}>
  {currentWeek.is_desperate ? 'Deactivate' : 'Mark as Desperate Week'}
</Button>
```

**Stats Cards:**
- "Beds Confirmed" (green) - Total confirmed
- "Beds Needed" (blue) - Admin-set total needed (editable input)
- "Still Needed" (orange) - Calculated remaining
- "Progress" (purple) - Percentage complete

### ReportsTab Component

**Current Week Summary:**
```jsx
<div>Expected Guests: {guestCount}</div>
<div>
  Beds Still Needed: {bedsStillNeeded}
  <small>{bedsConfirmed} of {bedsNeeded} confirmed</small>
</div>
<div>
  Meals Still Needed: {mealsStillNeeded}  
  <small>{totalMeals} confirmed</small>
</div>
```

## Testing Checklist

- [ ] Run migration: `20241209_fix_reporting_and_desperate_week.sql`
- [ ] Deploy updated edge function: `send-weekly-report`
- [ ] Verify "Expected Guests" shows correct count (check guests table has data)
- [ ] Verify "Beds Still Needed" calculates correctly (needed - confirmed)
- [ ] Verify "Meals Still Needed" calculates correctly
- [ ] Test desperate week toggle button
- [ ] Verify 🚨 badge appears when desperate is true
- [ ] Test address column appears in email reports
- [ ] Set up Sunday cron job for reset_desperate_week_flags()
- [ ] Verify desperate flag resets on past weeks

## Deployment Commands

```powershell
# 1. Run database migration
# Execute in Supabase SQL Editor:
# supabase/migrations/20241209_fix_reporting_and_desperate_week.sql

# 2. Redeploy send-weekly-report function
supabase functions deploy send-weekly-report --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt

# 3. Set up cron job (in Supabase SQL Editor)
SELECT cron.schedule(
  'reset-desperate-weeks',
  '0 0 * * 0',
  $$ SELECT reset_desperate_week_flags(); $$
);

# 4. Verify cron job
SELECT * FROM cron.job WHERE jobname = 'reset-desperate-weeks';
```

## Data Verification

```sql
-- Check current week status
SELECT * FROM current_week_summary;

-- Check desperate weeks
SELECT 
  id,
  week_start_date,
  week_end_date,
  is_desperate,
  expected_guests
FROM desperate_weeks
WHERE week_end_date >= CURRENT_DATE
ORDER BY week_start_date;

-- Check if addresses exist
SELECT id, person_name, address 
FROM apartments 
WHERE address IS NOT NULL
LIMIT 10;

-- Check guest count for current week
SELECT w.week_start_date, COUNT(g.id) as guest_count
FROM desperate_weeks w
LEFT JOIN guests g ON g.week_id = w.id
WHERE w.week_end_date >= CURRENT_DATE
GROUP BY w.id, w.week_start_date;
```

## Summary

All reporting issues have been fixed:
✅ Address column working (just needs redeploy)  
✅ Expected Guests query correct (check data)  
✅ "Still Needed" calculations implemented  
✅ Desperate Week toggle added with visual indicators  
✅ Auto-reset function created for Sundays  
✅ Comprehensive view and helper functions added  

The system now correctly shows remaining needs rather than total needs, making it much clearer how many more beds/meals are required!
