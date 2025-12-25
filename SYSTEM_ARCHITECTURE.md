# Complete System Architecture

## Overview
The system now integrates the IVR menu builder with beds and meals management as additional options.

## How It Works

### 1. Incoming Call Flow
When someone calls the main number:

1. **IVR Menu Loads** (`incoming-call` function)
   - Queries `ivr_menus` table for the main menu
   - Loads configured menu options from `ivr_menu_options`
   - Adds two additional hardcoded options:
     - **Press 3**: Guest beds availability
     - **Press 4**: Shabbat meal hosting

2. **Caller Presses a Digit** → Routes to `handle-ivr-selection`
   - **Digits 1, 2, 5-9, *, #**: Handled by IVR Builder configuration
   - **Digit 3**: Redirects to `open-call-system` (beds)
   - **Digit 4**: Redirects to `handle-meal-call` (meals)

### 2. Beds System (Option 3)
Routes to `open-call-system` which handles:

**For New Callers:**
- Tells how many beds are needed
- Asks for bed count
- Records caller's name
- Asks if they want weekly calls
- Creates apartment record with phone number

**For Existing Hosts:**
- "You have X beds, press 1 to confirm / 2 to update"
- Updates bed count and last_helped_date
- Tracks times_helped for priority ordering

**Admin Access (Press 8 during initial greeting):**
- Password: 7587
- Menu: 1 for beds, 2 for meals
- Can update weekly bed needs
- Can trigger automated calls (priority-based)

### 3. Meals System (Option 4)
Routes to `handle-meal-call` which handles:
- Asks how many guests can host
- Asks which meals (Friday night, Saturday day, or both)
- Tracks in `meal_availabilities` table
- Updates weekly meal counts

### 4. IVR Builder (Other Options)
- **Voicemail**: Routes to voicemail boxes
- **Transfer**: Transfers to phone number
- **Custom Functions**: Can route to any Edge Function
- **Submenu**: Opens another menu level

## Frontend Tabs

1. **Dashboard**: Overview and stats
2. **Hosts**: Manage apartment/host records
3. **Guests**: Track guest information (optional)
4. **Weekly Beds**: View and manage bed needs per week
5. **Meals**: Manage meal hosts
6. **Meal Audio**: Upload custom MP3 files for meal calls
7. **IVR Builder**: Design phone menu with drag-and-drop
8. **Voicemails**: Listen to and manage voicemail boxes
9. **Calls**: View incoming call logs
10. **Reports**: Analytics and reporting
11. **System**: Configure defaults and admin password

## Database Tables

### Core System
- `apartments`: Host records with phone, bed capacity, last_helped_date
- `weekly_bed_tracking`: Tracks beds_needed vs beds_confirmed per week
- `system_settings`: Admin password, default beds needed, etc.
- `desperate_weeks`: Week records (Friday-Saturday)

### Meals System
- `meal_hosts`: People who can host meals
- `meal_availabilities`: Weekly meal confirmations per host
- `meal_calls`: Call tracking for meals
- `meal_audio_settings`: Custom audio prompts for meal calls

### IVR System
- `ivr_menus`: Menu configurations
- `ivr_menu_options`: Menu options (digit → action mappings)
- `voicemail_boxes`: Voicemail box configurations
- `voicemails`: Voicemail recordings

## Setup Steps

1. **Run Database Migrations:**
   ```sql
   -- In Supabase SQL Editor:
   -- 1. Run SETUP_OPEN_CALL_SYSTEM.sql
   -- 2. Run CREATE_MEAL_TABLES.sql
   -- 3. Run CREATE_CURRENT_WEEK.sql
   ```

2. **Configure System Settings** (System tab in frontend):
   - Default beds needed per week: 30
   - Admin menu digit: 8
   - Admin password: 7587
   - Default meal counts (if needed)

3. **Set Up IVR Menu** (IVR Builder tab):
   - Create main menu
   - Add options for digits 1, 2, 5-9 (3 and 4 are reserved)
   - Configure voicemail boxes
   - Upload custom audio files if desired

4. **Update Twilio Webhook:**
   - Point to: `https://wwopmopxgpdeqxuacagf.supabase.co/functions/v1/incoming-call`

## System Behavior

### Priority Calling Algorithm
When admin triggers automated calls for beds:
```sql
ORDER BY last_helped_date NULLS FIRST, times_helped ASC
```
- Hosts who never helped get called first
- Among those who helped, those who helped longest ago get called first
- Those who helped least number of times get priority

### Open Call-In Model
- Anyone can call anytime (not just scheduled call times)
- No pre-registration required
- System captures phone number automatically
- New callers get registered on first call
- Existing callers are recognized by phone number

### Capacity Tracking
- Tracks only capacity (beds needed vs confirmed)
- No guest names or arrival dates stored
- Weekly reset of bed needs
- Cumulative tracking of host participation

## Voice Settings
All TwiML uses `voice="man"` for consistent male voice across all prompts.

## Edge Functions Deployed
1. `incoming-call` - Main IVR entry point
2. `handle-ivr-selection` - Routes IVR options
3. `open-call-system` - Beds management entry
4. `handle-new-host` - New caller registration
5. `handle-host-name-recording` - Records host names
6. `handle-weekly-calls-preference` - Weekly call opt-in
7. `handle-host-response` - Existing host confirmations
8. `handle-host-update-beds` - Update bed counts
9. `handle-admin-menu` - Admin password verification
10. `handle-admin-selection` - Admin menu routing
11. `handle-admin-beds-action` - Admin bed management
12. `handle-admin-update-beds` - Update weekly bed needs
13. `handle-admin-send-calls` - Trigger automated calls
14. `handle-meal-call` - Meal hosting calls
15. `handle-meal-response` - Meal confirmations

All functions deployed with `--no-verify-jwt` flag.
