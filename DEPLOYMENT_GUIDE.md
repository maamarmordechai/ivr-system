# 🚀 Deployment Guide - Dynamic IVR System

## ✅ Edge Functions Deployed

All Edge Functions successfully deployed to Supabase:

1. ✅ **incoming-call** - Dynamic IVR entry point (week-specific or default menus)
2. ✅ **handle-bed-response** - Processes bed availability responses
3. ✅ **handle-ivr-selection** - Routes menu selections to actions
4. ✅ **handle-voicemail** - Records and saves voicemails
5. ✅ **make-live-call** - Initiates live calls from dashboard

---

## 📋 Database Migrations (Execute These Now)

Open Supabase SQL Editor: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/sql/new

Execute these 4 migrations **in order**:

### 1️⃣ Update Guests Table
**File:** `supabase/migrations/20241207_update_guests_table.sql`
- Adds week_id column (FK to weekly_bed_needs)
- Renames number_of_people → group_size
- Removes date columns (check_in, check_out, arrival)
- Auto-updates expected_guests via trigger

### 2️⃣ Expected Guests & Priority
**File:** `supabase/migrations/20241207_add_expected_guests_and_priority.sql`
- Adds expected_guests column
- Priority tracking for intelligent calling
- Week-based guest counting

### 3️⃣ Dynamic IVR System
**File:** `supabase/migrations/20241207_create_ivr_system.sql`
- Per-week menu configurations
- get_active_menu_for_week() function
- copy_menu_for_week() function
- Priority levels for voicemail boxes

### 4️⃣ Voicemails Table
**File:** `supabase/migrations/20241207_create_voicemails_table.sql`
- Creates voicemails table
- Stores recordings and transcriptions
- Priority-based sorting

---

## 🎯 What's New

### Per-Week IVR Configuration
- **Default Mode**: Edit menus for all weeks
- **Week-Specific Mode**: Custom menus per week
- Automatic fallback to default if no custom menu

### Priority Voicemail System
- Multiple boxes: Our Community (priority 100), Other Communities, General
- Admin UI sorts by priority
- Future: Email notifications

### Dynamic Menu Builder (IVRBuilderTab)
- No code changes needed
- Assign any digit to any action
- Actions: Voicemail, Function, Transfer, Submenu, Hangup
- Copy default menu to customize for specific weeks

### Simplified Guest Registration
- Week selector dropdown (next 8 Shabbos weeks)
- Auto-calculates expected guests
- No more date pickers

---

## 🧪 Testing Steps

### 1. Execute Migrations
- Copy each SQL file content
- Paste into Supabase SQL Editor
- Click Run
- Verify "Success. No rows returned"

### 2. Test Guest Registration
- Go to Guests tab
- Click "Add Guest"
- Select week from dropdown
- Save and verify expected_guests updates

### 3. Test Default IVR
- Go to IVRBuilderTab → "Default Menus"
- View main menu
- Call Twilio number
- Verify menu plays

### 4. Create Week-Specific Menu
- Switch to "Week-Specific" mode
- Select a week
- Click "Copy Default Menu"
- Edit menu (change digits, add voicemail boxes)
- Save
- Call during that week to test

### 5. Test Voicemail
- Configure menu option to route to voicemail
- Call system and select that option
- Leave message
- Check voicemails table

### 6. Test Live Call
- Go to Bed Management tab
- Click phone icon on host card
- Verify call connects

---

## 📊 New Database Functions

- `get_active_menu_for_week(week_id, menu_key)` - Returns active menu
- `copy_menu_for_week(menu_key, week_id)` - Copies menu for customization
- `calculate_expected_guests_by_week(week_id)` - Counts guests
- `get_voicemails_with_priority()` - Sorted voicemails

---

## 🔗 Quick Links

- **SQL Editor**: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/sql/new
- **Edge Functions**: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
- **Tables**: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/editor
- **Local App**: http://localhost:3001

---

## ✨ Complete Feature Set

✅ Dynamic per-week IVR menus  
✅ Multiple priority voicemail boxes  
✅ Auto-calculated expected guests  
✅ Priority calling system  
✅ Quota-based auto-stop  
✅ Live call button  
✅ Simplified week-based registration  
✅ Flexible menu configuration (no code needed)

---

## 📝 Next Steps

1. ✅ Edge Functions deployed
2. ⏳ Execute 4 SQL migrations
3. ⏳ Test guest registration
4. ⏳ Configure IVR menu for next week
5. ⏳ Test phone system
6. 🔜 Set up email notifications (future)
