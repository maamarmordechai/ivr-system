# Bed Confirmation Tracking System

## What's New

Now you can see **exactly who confirmed beds** and have the ability to:
- ✅ **Call back** any host who confirmed
- ✅ **Void** a confirmation if someone cancels
- ✅ Track confirmation **method** (phone call, manual, etc.)
- ✅ See **timestamp** of when each host confirmed

## Setup Required

### 1. Run SQL Migration
Go to Supabase Dashboard → SQL Editor and run:
```sql
-- Copy and paste contents of:
supabase/migrations/20241208_create_bed_confirmations.sql
```

This creates the `bed_confirmations` table to track individual confirmations.

### 2. That's It!
The Edge Functions are already deployed and will automatically create confirmation records when hosts call in.

## How It Works

### When a Host Confirms Beds:
1. Host calls the system
2. Presses **1** (yes, all beds) or **3** (partial beds)
3. System creates a record in `bed_confirmations` table with:
   - Week ID
   - Apartment ID
   - Number of beds confirmed
   - Timestamp
   - Method (phone_call)
   - Voided status (false by default)

### In the Dashboard (Bed Management Tab):
You'll see a detailed table showing:
- **Host Name** - Who confirmed
- **Phone Number** - Clickable to call
- **Beds Confirmed** - How many beds
- **Confirmed** - Date and time
- **Method** - How they confirmed (phone_call, manual, weekly_call)
- **Actions**:
  - 🔵 **Call** button - Call the host back
  - 🔴 **Void** button - Cancel this confirmation

### Voiding a Confirmation:
1. Click the red **Void** button next to any confirmation
2. Confirm the action
3. System automatically:
   - Marks confirmation as voided
   - Decrements the beds_confirmed count
   - Keeps the record for audit trail (just hidden from view)

## Summary Stats:
- **Total Confirmations** - Number of separate confirmations
- **Total Beds Confirmed** - Sum of all beds
- **Unique Hosts** - How many different hosts confirmed

## Example Use Cases:

**Scenario 1: Host Cancels**
- Host Yossi confirmed 3 beds on Monday
- Calls Wednesday to cancel
- You click "Void" next to his confirmation
- Count drops from 10 → 7 beds confirmed

**Scenario 2: Need to Follow Up**
- See that Moshe confirmed 5 beds yesterday
- Want to confirm pickup details
- Click "Call" button next to his name
- Phone dials automatically

**Scenario 3: Audit Trail**
- Week is over, need to see who helped
- View all confirmations with timestamps
- Export or review for thank you calls
- See who confirmed via phone vs. manual entry
