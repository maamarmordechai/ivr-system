# Weekly Availability Check System - Setup Guide

## Overview
This system allows you to enable a special mode where ALL incoming calls will first ask hosts about their availability for the week. Perfect for busy weeks when you need quick responses.

## Features

✅ **3 Options for Hosts**:
- Press 1: Yes, I'm available (then asks for bed count)
- Press 2: No, not available this week
- Press 3: Call me back on Friday

✅ **Custom MP3 Files**: Upload your own audio prompts
✅ **Name Playback**: System plays host's recorded name after "Thank you Mr/Mrs"
✅ **Friday Callback List**: See all hosts who want Friday callbacks
✅ **Real-time Tracking**: Track all responses in UI
✅ **Easy Toggle**: Turn weekly mode on/off with one button

## Setup Steps

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor
-- Run: supabase/migrations/20241215_create_weekly_availability_system.sql
```

### 2. Deploy Edge Function
Deploy `handle-weekly-availability` function in Supabase dashboard

### 3. Deploy Updated Functions
- Deploy updated `incoming-call` function (now checks for weekly mode)

### 4. Upload Your MP3 Files
1. Go to **Weekly Check** tab in the portal
2. Scroll to **Audio Prompts** section
3. For each prompt, paste the URL of your MP3 file:
   - **Availability Question**: Main question asking if available
   - **Thank You Mr/Mrs**: "Thank you Mr" or "Thank you Mrs" (before name)
   - **Beds Question**: "How many beds do you have available?"
   - **Thank You Callback**: "Thank you, we will call you back"

### 5. Enable Weekly Mode
Click the **"Enable Weekly Mode"** button in the Weekly Check tab

## How It Works

### Call Flow

```
1. Caller dials → System checks if weekly mode enabled
   ↓
2. If YES → Redirect to weekly availability check
   ↓
3. Play availability question MP3
   "Are you available this week? Press 1 for yes, 2 for no, 3 for Friday callback"
   ↓
4a. Press 1 (YES):
    → Play "Thank you Mr/Mrs" MP3
    → Play host's recorded name
    → Play "How many beds?" MP3
    → Capture bed count (press #)
    → Save response + beds
    → Play "Thank you, we'll call you back" MP3
    
4b. Press 2 (NO):
    → Save "no" response
    → Play "Thank you" MP3
    → Hangup
    
4c. Press 3 (FRIDAY):
    → Save "friday_callback" response
    → Add to Friday callback list
    → Play "We'll call Friday" MP3
    → Hangup
```

### UI Features

**Summary Cards**:
- Green: Available (Option 1) + Total beds offered
- Red: Not Available (Option 2)
- Blue: Call Friday (Option 3)
- Gray: Total responses

**Friday Callbacks Section**:
- Large blue highlighted area
- Shows name, phone, address, usual bed count
- Easy to call everyone on Friday

**All Responses Table**:
- Complete history of all responses
- Filterable and sortable
- Shows response type, beds offered, timestamp

## Usage Tips

### Before Busy Week
1. Enable Weekly Mode on Sunday/Monday
2. Wait for hosts to call in
3. Check Friday Callback list on Friday
4. Call everyone who pressed 3

### During Week
- Monitor responses in real-time
- See total beds confirmed
- Track who hasn't responded yet

### After Week
- Disable Weekly Mode
- Export data for records
- Normal IVR menu resumes

## MP3 File Examples

### Availability Question
"Hello! This is Hachnusas Orchim calling to check availability for this Shabbos. Press 1 if you are available to host guests this week. Press 2 if you are not available. Press 3 if you want us to call you back on Friday."

### Thank You Mr/Mrs
"Thank you Mr" (short, will be followed by name playback)

### Beds Question
"How many beds can you provide this week? Enter the number and press pound."

### Thank You Callback
"Thank you for your response. We will call you back if we need beds. Goodbye."

## Database Tables

### weekly_availability_calls
Stores all responses with:
- `week_id`: Which week
- `apartment_id`: Which host
- `response_type`: 'yes', 'no', or 'friday_callback'
- `beds_offered`: Number of beds (if yes)
- `created_at`: When they called

### audio_prompts
Stores MP3 URLs for:
- availability_question
- thank_you_mr
- beds_question
- thank_you_callback

## Troubleshooting

**No audio playing?**
- Check MP3 URLs are publicly accessible
- Test URLs in browser first
- Make sure URLs are https://

**Name not playing after "Thank you Mr"?**
- Host must have recorded their name during registration
- Check `name_recording_url` in apartments table

**Weekly mode not activating?**
- Check `enable_weekly_availability_mode` in system_settings
- Must be exactly 'true' (string)
- Redeploy incoming-call function

**Friday list empty?**
- Users must press 3 during call
- Check `response_type = 'friday_callback'` in database

## Advanced Features

### Custom Audio Per Host
Future enhancement: Upload different thank you messages for male/female hosts

### Auto-Call Friday List
Future enhancement: Trigger automated calls to Friday callback list

### SMS Notifications
Future enhancement: Send SMS to Friday callback list

### Analytics
- Track response rates
- Compare weeks
- Identify best/worst responders
