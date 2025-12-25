# Complete System Setup Guide

## 1. Database Setup (Run in Supabase SQL Editor)

Run these SQL files in order:

### Step 1: Core System Setup
```sql
-- Run: SETUP_OPEN_CALL_SYSTEM.sql
-- Creates: weekly_bed_tracking, system_settings, adds columns to apartments
```

### Step 2: Create Current Week
```sql
-- Run: CREATE_CURRENT_WEEK.sql
-- Creates: This week's entry in desperate_weeks and weekly_bed_tracking
```

### Step 3: Meal System Tables
```sql
-- Run: CREATE_MEAL_TABLES.sql
-- Creates: meal_hosts, meal_availabilities, meal_calls, meal_audio_settings
```

### Step 4: Bed Audio Settings
```sql
-- Run: CREATE_BED_AUDIO_TABLE.sql
-- Creates: bed_audio_settings table with default prompts
```

## 2. Twilio Configuration

**Webhook URL:** `https://wwopmopxgpdeqxuacagf.supabase.co/functions/v1/incoming-call`

1. Go to Twilio Console → Phone Numbers → Active Numbers
2. Click your phone number
3. Under "Voice & Fax" → "A CALL COMES IN"
4. Select "Webhook" 
5. Enter: `https://wwopmopxgpdeqxuacagf.supabase.co/functions/v1/incoming-call`
6. Method: HTTP POST
7. Click Save

## 3. IVR System Setup

### How Calls Are Routed:

**Main Entry Point:** `incoming-call` function
- Loads IVR menu from database
- Adds hardcoded options:
  - **Digit 3:** Beds management
  - **Digit 4:** Meals management
- Other digits (1, 2, 5-9, *, #): Your custom IVR options

### To Set Up Custom IVR Options:

1. Go to **IVR Builder** tab in frontend
2. Create main menu (mark as "Main Menu")
3. Add menu options for digits 1, 2, 5-9, *, # (3 and 4 are reserved)
4. For each option, choose action type:
   - **Voicemail:** Route to voicemail box
   - **Transfer:** Transfer to phone number
   - **Custom Function:** Route to any Edge Function
   - **Submenu:** Open another menu level

### Pre-configured Routes:

**Digit 3 → Beds System:**
```
incoming-call → handle-ivr-selection (digit 3) → open-call-system
```

**Digit 4 → Meals System:**
```
incoming-call → handle-ivr-selection (digit 4) → handle-meal-call
```

## 4. Deployed Edge Functions

All 15 functions are deployed:

### Main Entry & Routing
1. **incoming-call** - Main entry point, displays IVR menu
2. **handle-ivr-selection** - Routes IVR digits (3→beds, 4→meals, others→IVR config)

### Beds System (Option 3)
3. **open-call-system** - Entry point for beds, recognizes existing/new hosts
4. **handle-new-host** - Registers new hosts, collects bed count
5. **handle-host-name-recording** - Saves name recording to voicemail box 99
6. **handle-weekly-calls-preference** - Asks if host wants weekly calls
7. **handle-host-response** - Existing host confirmation (press 1 or 2)
8. **handle-host-update-beds** - Updates bed count for existing host

### Admin System (Press 8 during initial greeting)
9. **handle-admin-menu** - Password verification (default: 7587)
10. **handle-admin-selection** - Choose beds (1) or meals (2) management
11. **handle-admin-beds-action** - Update weekly needs or trigger calls
12. **handle-admin-update-beds** - Set beds needed for the week
13. **handle-admin-send-calls** - Initiates automated priority-based calls

### Meals System (Option 4)
14. **handle-meal-call** - Meal hosting call entry
15. **handle-meal-response** - Processes meal confirmations

## 5. Audio Customization

### Bed Audio (Tab: Bed Audio)
Upload custom MP3 files for:
- `welcome_message` - Initial greeting
- `beds_needed_prompt` - Announces beds needed
- `existing_host_greeting` - "Welcome back" message
- `existing_host_prompt` - Press 1 to confirm, 2 to update
- `new_host_prompt` - How many beds can you provide?
- `thank_you_message` - Thanks for confirmation
- `name_recording_prompt` - Record your name after beep
- `weekly_calls_question` - Want weekly calls?

**Or use text-to-speech:** Edit default_text in `bed_audio_settings` table

### Meal Audio (Tab: Meal Audio)
Upload custom MP3 files for:
- `intro` - Meal hosting intro
- `guest_count_prompt` - How many guests?
- `meal_selection` - Which meals? (1, 2, or 3)
- `day_meal_only` - Saturday day confirmation
- `night_meal_only` - Friday night confirmation
- `both_meals` - Both meals confirmation
- `thank_you` - Thank you message

**Or use text-to-speech:** Edit default_text in `meal_audio_settings` table

## 6. System Settings (System Tab)

Configure in the frontend:

### Weekly Defaults
- **Default beds needed per week:** 30 (adjustable)
- **Default Friday night meals needed:** 0
- **Default Saturday day meals needed:** 0

### Admin Access
- **Admin menu digit:** 8 (press during greeting to access admin)
- **Admin password:** 7587 (4-digit numeric password)

## 7. Call Flow Examples

### Example 1: First-time Caller (Beds)
1. Caller dials → Hears IVR menu
2. Presses 3 for beds
3. System: "We are looking for X beds this week"
4. System: "How many beds can you provide?"
5. Caller enters number (e.g., 05)
6. System: "Thank you for offering 5 beds"
7. System: "Please record your name after the beep"
8. Caller records name → Saved to voicemail box 99
9. System: "Would you like weekly calls? Press 1 for yes, 2 for no"

### Example 2: Returning Host (Beds)
1. Caller dials → System recognizes phone number
2. Presses 3 for beds
3. System: "Hello, welcome back"
4. System: "We are looking for X beds this week"
5. System: "Our records show you have 5 beds available"
6. System: "Press 1 to confirm all 5 beds, Press 2 to update"
7. Caller presses 1
8. System: "Thank you for confirming 5 beds. We appreciate your help"

### Example 3: Admin Access
1. Caller dials → Hears IVR menu
2. Presses 8 for admin
3. System: "Please enter the 4 digit admin password"
4. Enters 7587
5. System: "Press 1 for beds management, 2 for meals management"
6. Can update weekly needs or trigger automated calls

### Example 4: Meal Hosting (Option 4)
1. Caller dials → Hears IVR menu
2. Presses 4 for meals
3. System: "How many guests can you host? Press 0 if unavailable"
4. Enters number
5. System: "Which meals? Press 1=Friday night, 2=Saturday day, 3=Both"
6. Makes selection
7. System: Confirms selection and thanks host

## 8. Frontend Tabs

1. **Dashboard** - Overview and statistics
2. **Hosts** - Manage apartment/host records
3. **Weekly Beds** - Track bed needs vs confirmed
4. **Bed Audio** - Upload custom audio for bed calls
5. **Meals** - Manage meal hosts
6. **Meal Audio** - Upload custom audio for meal calls
7. **IVR Builder** - Design phone menu system
8. **Voicemails** - Listen to and manage voicemails
9. **Calls** - View incoming call logs
10. **Reports** - Analytics and reporting
11. **System** - Configure defaults and admin password

## 9. Database Tables Reference

### Core System
- `apartments` - Host records (phone, beds, last_helped_date)
- `desperate_weeks` - Week records (Friday-Saturday dates)
- `weekly_bed_tracking` - Beds needed/confirmed per week
- `system_settings` - Admin password, default values

### Beds Audio
- `bed_audio_settings` - Custom audio files or TTS text for bed calls

### Meals System
- `meal_hosts` - People who can host meals
- `meal_availabilities` - Weekly meal confirmations
- `meal_calls` - Meal call tracking
- `meal_audio_settings` - Custom audio files or TTS text for meal calls

### IVR System
- `ivr_menus` - Menu configurations
- `ivr_menu_options` - Menu options (digit → action)
- `voicemail_boxes` - Voicemail box configurations
- `voicemails` - Voicemail recordings

### Special Voicemail Boxes
- **Box 99:** New host name recordings (for admin review)

## 10. Quick Commands

### View who accepted beds this week:
```sql
-- Run: VIEW_CURRENT_WEEK_BEDS.sql
```

### Redeploy all functions:
```powershell
npx supabase functions deploy incoming-call --no-verify-jwt
npx supabase functions deploy handle-ivr-selection --no-verify-jwt
npx supabase functions deploy open-call-system --no-verify-jwt
npx supabase functions deploy handle-new-host --no-verify-jwt
npx supabase functions deploy handle-host-response --no-verify-jwt
npx supabase functions deploy handle-host-update-beds --no-verify-jwt
npx supabase functions deploy handle-admin-menu --no-verify-jwt
npx supabase functions deploy handle-admin-selection --no-verify-jwt
npx supabase functions deploy handle-admin-beds-action --no-verify-jwt
npx supabase functions deploy handle-admin-update-beds --no-verify-jwt
npx supabase functions deploy handle-admin-send-calls --no-verify-jwt
npx supabase functions deploy handle-meal-call --no-verify-jwt
npx supabase functions deploy handle-meal-response --no-verify-jwt
npx supabase functions deploy handle-host-name-recording --no-verify-jwt
npx supabase functions deploy handle-weekly-calls-preference --no-verify-jwt
```

## 11. Important Notes

- **Voice:** All TTS uses `voice="man"` for consistent male voice
- **Digit 3 & 4:** Reserved for beds and meals - don't configure in IVR Builder
- **Admin Digit:** Default is 8, can be changed in System Settings
- **Priority Calling:** Hosts who haven't helped longest get called first
- **Open System:** Anyone can call anytime, no pre-registration required
- **Audio Files:** Upload MP3 files OR use text-to-speech (editable)
- **Voicemail Box 99:** Special box for new host name recordings

## 12. Troubleshooting

**Problem:** "No current week configured"
**Solution:** Run `CREATE_CURRENT_WEEK.sql`

**Problem:** IVR menu not showing
**Solution:** Create main menu in IVR Builder tab OR system will use default greeting

**Problem:** Can't upload audio
**Solution:** Ensure `call-audio` bucket exists in Supabase Storage with public access

**Problem:** Beds not tracking
**Solution:** Run `SETUP_OPEN_CALL_SYSTEM.sql` to create tables and functions

**Problem:** Admin password not working
**Solution:** Check `system_settings` table has `admin_password` = '7587' or your custom password
