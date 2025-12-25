# IVR Menu Builder System - Deployment Guide

## ✅ What Was Fixed

1. **Syntax Error** - Fixed missing closing brace in `handle-menu-selection/index.ts` (case "3" was missing `}`)
2. **Dynamic IVR System** - Complete database-driven IVR builder with custom names and prompts

## 📦 New Features

### Visual IVR Builder
- Customize ALL menu names, prompts, and options via UI
- No more hardcoded menus - everything in database
- Create unlimited menu levels
- Support for: Voicemail, Sub-menus, Call Transfer, Custom Functions, Hangup

## 📋 Files Created/Updated

### Database
- ✅ `20241204_add_voicemail_system.sql` - Voicemail boxes
- ✅ `20241204_add_ivr_builder.sql` - **NEW** Dynamic IVR menu system

### Edge Functions (All Updated for Database-Driven IVR)
- ✅ `incoming-call/index.ts` - Reads main menu from database
- ✅ `handle-ivr-menu/index.ts` - Routes based on database configuration
- ✅ `handle-voicemail-recording/index.ts` - Unchanged (saves recordings)
- ✅ `handle-menu-selection/index.ts` - Fixed syntax, still handles host availability

### Frontend
- ✅ `IVRBuilderTab.jsx` - **NEW** Full visual IVR editor
- ✅ `VoicemailsTab.jsx` - Listen to voicemails
- ✅ `AccommodationPortal.jsx` - Added IVR Builder tab

## 🚀 Deployment Steps

### 1. Run Database Migrations (IN ORDER!)
```bash
# In Supabase Dashboard → SQL Editor
# Run these in order:

1. supabase/migrations/20241204_add_voicemail_system.sql
2. supabase/migrations/20241204_add_ivr_builder.sql
```

### 2. Deploy Edge Functions
```bash
cd supabase

# Deploy all functions
supabase functions deploy incoming-call
supabase functions deploy handle-ivr-menu
supabase functions deploy handle-voicemail-recording
supabase functions deploy handle-menu-selection
```

### 3. Configure Your IVR (Via UI!)
1. Go to your app → **IVR Builder** tab
2. You'll see the default "Main Menu" already created
3. Click on a menu to see its options
4. Click "Add Option" to add digit choices
5. Edit any menu to change:
   - Menu Name (e.g., "Main Menu" → "Customer Service")
   - Prompt Text (what callers hear)
   - Voice (alice, man, woman)
   - Timeout settings

## 🎯 How It Works

### Database Structure

**ivr_menus_v2** - Each menu level
- `menu_name` - Display name (e.g., "Guest Services")
- `menu_key` - Unique ID (e.g., "guest_services")
- `prompt_text` - What callers hear
- `voice_name` - alice/man/woman
- `parent_menu_id` - For sub-menus

**ivr_menu_options** - What each digit does
- `digit` - 0-9, *, #
- `option_name` - Display name (e.g., "Leave Message")
- `action_type` - voicemail/submenu/transfer/custom_function/hangup
- `voicemail_box_id` - Links to voicemail_boxes
- `submenu_id` - Links to another menu
- `transfer_number` - Phone number for transfers
- `function_name` - Custom Edge Function name

### Default Configuration

After running migrations, you get:

**Main Menu** (menu_key: "main")
- Press 1 → Guest Services sub-menu
- Press 2 → Host Registration voicemail
- Press 3 → Urgent/Host Availability (custom function)
- Press 0 → Main Office voicemail

**Guest Services Sub-menu** (menu_key: "guest_services")
- Press 1 → Billing voicemail
- Press 2 → Technical Support voicemail
- Press 9 → Return to Main Menu

## 🎨 Customization Examples

### Example 1: Change Main Menu Greeting
1. Go to IVR Builder tab
2. Click "Main Menu"
3. Click "Edit Menu"
4. Change "Prompt Text" to: "Thank you for calling Skytek Accommodations. Press 1 for guest services, Press 2 for host registration, Press 3 for urgent matters, Press 0 for our main office."
5. Click "Save Menu"

### Example 2: Add New Menu Option
1. Select a menu (e.g., "Main Menu")
2. Click "Add Option"
3. Set:
   - Digit: 4
   - Option Name: "Billing Department"
   - Action Type: Transfer
   - Transfer Number: +1234567890
4. Click "Save Option"

### Example 3: Create New Sub-Menu
1. Click "New Menu"
2. Fill in:
   - Menu Name: "Sales Department"
   - Menu Key: "sales"
   - Prompt Text: "You've reached sales. Press 1 for new bookings, Press 2 for pricing info."
3. Click "Save Menu"
4. Go back to Main Menu
5. Click "Add Option"
6. Set:
   - Digit: 4
   - Option Name: "Sales"
   - Action Type: Go to Sub-menu
   - Sub-menu: Sales Department
7. Click "Save Option"

## 🔧 Technical Details

### Edge Function Flow

1. **incoming-call** → Queries `ivr_menus_v2` for "main" menu → Reads `prompt_text` and `voice_name` → Generates TwiML `<Gather>` → Routes to `handle-ivr-menu?MenuKey=main`

2. **handle-ivr-menu** → Receives MenuKey + Digits → Queries `ivr_menu_options` for that digit → Based on `action_type`:
   - **voicemail** → Generates `<Record>` TwiML with greeting from voicemail_boxes
   - **submenu** → Redirects to same function with new MenuKey
   - **transfer** → Generates `<Dial>` TwiML with phone number
   - **custom_function** → Redirects to specific Edge Function (e.g., check_host_availability)
   - **hangup** → Generates `<Hangup>` TwiML

3. **handle-voicemail-recording** → Twilio webhook → Saves recording metadata to `voicemails` table

### Custom Functions

For action_type = 'custom_function', the system redirects to an Edge Function with that name:
- `check_host_availability` → Already implemented in handle-menu-selection
- You can add more by:
  1. Creating new Edge Function
  2. Setting function_name in IVR option
  3. System auto-redirects: `https://[host]/functions/v1/[function_name]`

## 📊 Database Schema

```sql
-- Menus (each level in IVR tree)
ivr_menus_v2
  ├─ menu_name (text) - "Main Menu", "Guest Services"
  ├─ menu_key (text) - "main", "guest_services" 
  ├─ prompt_text (text) - What callers hear
  ├─ voice_name (text) - alice/man/woman
  ├─ timeout_seconds (int) - How long to wait for input
  ├─ parent_menu_id (uuid) - For nested menus
  └─ parent_digit (text) - Which digit from parent leads here

-- Options (what each digit does in a menu)
ivr_menu_options
  ├─ menu_id (uuid) - Which menu this belongs to
  ├─ digit (text) - 0-9, *, #
  ├─ option_name (text) - "Leave Voicemail", "Billing"
  ├─ action_type (text) - voicemail/submenu/transfer/custom_function/hangup
  ├─ voicemail_box_id (uuid) - If action = voicemail
  ├─ submenu_id (uuid) - If action = submenu
  ├─ transfer_number (text) - If action = transfer
  └─ function_name (text) - If action = custom_function
```

## 🎉 You Now Have

✅ Fully customizable IVR system (no code changes needed!)  
✅ Visual menu builder with drag-and-drop workflow  
✅ Unlimited menu depth and options  
✅ Voicemail boxes with transcription  
✅ Call transfers  
✅ Custom function integration  
✅ Professional multi-level phone system  

## 🐛 Troubleshooting

**"Menu not found: main"**
- Run the migrations - default menus not created yet

**"Option returns invalid selection"**
- Check IVR Builder - make sure option has valid action configured
- For voicemail: Ensure voicemail_box_id is set
- For submenu: Ensure submenu_id is set

**"Caller hears old menu prompts"**
- Edge Functions cached old code
- Redeploy: `supabase functions deploy incoming-call handle-ivr-menu`

**"Voicemail not recording"**
- Check voicemail_boxes table has the box
- Ensure box is active (is_active = true)
- Check handle-voicemail-recording is deployed

## 📝 Next Steps

1. Deploy the migrations and functions (see steps above)
2. Test by calling your Twilio number
3. Go to IVR Builder tab and customize everything!
4. Change menu names, prompts, voices to match your brand
5. Add new options as your business grows

All changes via UI - no more code editing! 🎊
