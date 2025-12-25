# Call Frequency & Busy Shabbos System - Complete Guide

## Overview
This system provides flexible call frequency options and automatic busy week handling.

## Call Frequency Options

### 1. Weekly
- Calls every week
- For hosts who want regular availability checks

### 2. Bi-Weekly (Every Second Week)
- Calls every 2 weeks
- For hosts who prefer less frequent contact

### 3. Monthly (Once a Month)
- Calls every 4 weeks
- For hosts who only occasionally host

### 4. Desperate-Only (Busy Weeks Only)
- Only called during busy Shabbos weeks
- Perfect for backup hosts

## Busy Shabbos System

### How It Works
1. **Regular Weeks**: System calls based on frequency preference
2. **Busy Weeks**: ALL hosts get called (except "never")
   - Weekly hosts: Called
   - Bi-weekly hosts: Called (even if not their week)
   - Monthly hosts: Called (even if not their month)
   - Desperate-only hosts: Called

### Admin Trigger
- Admin can call in and press digit 6 (or designated number)
- Confirms: "Press 1 to trigger busy Shabbos campaign"
- System marks current week as busy
- Automatically calls all eligible hosts

## Database Functions

### `should_call_apartment(apt_id, target_week_date)`
- Returns TRUE/FALSE if apartment should be called
- Logic:
  1. If busy week → call everyone (except "never")
  2. If desperate-only → only call on busy weeks
  3. If weekly/bi-weekly/monthly → call based on schedule

### `get_apartments_to_call(target_week_date)`
- Returns list of all apartments to call for a week
- Includes reason (busy week, regular schedule, etc.)
- Ordered by priority (desperate-only first on busy weeks)

### `trigger_busy_shabbos_campaign(target_week_date, admin_user)`
- Admin function to trigger campaign
- Creates/updates desperate_weeks entry
- Returns count of apartments to call

## Files Created

### Database Migration
- `20241209_add_call_frequency_and_busy_shabbos.sql`
  - Updates call_frequency constraint
  - Adds trigger tracking to desperate_weeks
  - Creates helper functions
  - Creates admin dashboard view

### Edge Function
- `trigger-busy-campaign/index.ts`
  - Phone system function for admin trigger
  - Confirms before triggering
  - Reports number of hosts to call

### Configuration SQL
- `UPDATE_IVR_MENU_ALL_FUNCTIONS.sql`
  - Updates IVR menu options
  - Adds all functions to dropdown
  - Updates prompts

### Updated Function
- `register-host/index.ts`
  - Now asks for 4 frequency options
  - Press 1: Every week
  - Press 2: Every second week
  - Press 3: Once a month
  - Press 4: Only busy weeks

## Implementation Steps

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- File: 20241209_add_call_frequency_and_busy_shabbos.sql
```

### 2. Update IVR Menu
```sql
-- Run: UPDATE_IVR_MENU_ALL_FUNCTIONS.sql
-- This adds all functions to the dropdown
```

### 3. Deploy Functions
- Deploy updated `register-host` function
- Deploy new `trigger-busy-campaign` function

### 4. Test Registration Flow
1. Call system, press 2 (register as host)
2. Enter number of beds
3. Record name
4. Select frequency (1-4)
5. Answer private entrance question

### 5. Test Busy Trigger
1. Admin calls system
2. Press digit 6 (or configured admin digit)
3. Press 1 to confirm
4. System reports number of hosts to call

## Admin Dashboard View

Use this query to see campaign status:
```sql
SELECT * FROM call_campaign_overview;
```

Shows:
- Week dates
- Is busy week?
- Who triggered it
- How many apartments to call
- Breakdown by frequency type

## Example Scenarios

### Scenario 1: Regular Week
- Weekly hosts: Called (if 1 week since last call)
- Bi-weekly hosts: Called (if 2 weeks since last call)
- Monthly hosts: Called (if 4 weeks since last call)
- Desperate-only: NOT called

### Scenario 2: Busy Week (Auto or Triggered)
- Weekly hosts: Called
- Bi-weekly hosts: Called (even if called last week)
- Monthly hosts: Called (even if called recently)
- Desperate-only: Called (this is why they registered!)

### Scenario 3: Host Preferences
- Host A: "Every week" → 52 calls/year
- Host B: "Every 2 weeks" → 26 calls/year + busy weeks
- Host C: "Monthly" → 13 calls/year + busy weeks
- Host D: "Busy only" → 0-10 calls/year (only busy weeks)

## Integration with Existing System

The system works with your existing:
- `apartments` table (updated with new frequency values)
- `desperate_weeks` table (enhanced with trigger tracking)
- IVR menu system (updated with new options)
- Phone calling system (uses new logic functions)

## Future Enhancements

Possible additions:
1. Web dashboard to trigger busy week
2. Email notifications when campaign triggered
3. SMS backup for hosts who don't answer
4. Statistics on response rates by frequency type
5. Automatic busy week detection based on guest demand
