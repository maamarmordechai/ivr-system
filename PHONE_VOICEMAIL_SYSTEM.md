# Phone Voicemail Checking System

Complete implementation of phone-based voicemail checking for the IVR system. This allows hosts to call in, access the admin menu, and listen to their voicemails with options to delete, save, or skip messages.

## Features

✅ **Play Voicemails**: Listen to voicemail recordings over the phone  
✅ **Delete Messages**: Mark voicemails as listened and delete them  
✅ **Save Messages**: Mark voicemails as listened but keep them  
✅ **Skip Messages**: Move to the next voicemail without action  
✅ **Hebrew Interface**: All prompts in Hebrew with Alice voice  
✅ **Caller Information**: Announces caller name or phone number  
✅ **Count Display**: Shows how many unlistened messages exist  

## System Architecture

### Database
- Uses existing `voicemails` table
- Uses existing `voicemail_boxes` table
- Uses existing `apartments` table with `voicemail_box_id` foreign key

### Edge Function
- **Location**: `supabase/functions/check-voicemails-ivr/index.ts`
- **Endpoint**: `{supabaseUrl}/functions/v1/check-voicemails-ivr`
- **Method**: POST (called by Twilio)

### IVR Integration
- **Menu**: Admin submenu (accessed via digit 8 + password)
- **Digit**: 3 (third option in admin menu)
- **Configured via**: `CONFIGURE_ADMIN_MENU.sql`

## How It Works

### User Flow

1. **Call System** → Press 8 for admin menu
2. **Enter Password** → Access admin submenu
3. **Press 3** → Check voicemails
4. **System Announces**: "You have X new messages. First message from [caller name/number]"
5. **Play Recording**: Voicemail audio plays automatically
6. **Choose Action**:
   - Press 1: Delete message and move to next
   - Press 2: Save message and move to next
   - Press 3: Skip to next message without marking
   - Press 9: Exit voicemail system

### Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Initial Request (step: "initial")                       │
│    - Fetch apartment's voicemail_box_id                    │
│    - Query unlistened voicemails (listened = false)        │
│    - Order by created_at DESC (newest first)               │
│    - Count total messages                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Play First Voicemail                                     │
│    - Say: "You have X new messages"                        │
│    - Say: "First message from [caller info]"               │
│    - <Play> recording_url from storage                     │
│    - <Gather> user input (1 digit, 5 sec timeout)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Action Request (step: "action", digits: "1|2|3|9")      │
│                                                              │
│    Digit 1 (Delete):                                        │
│    - UPDATE voicemails SET listened = true                  │
│    - Move to next voicemail                                 │
│    - Say: "Message deleted"                                 │
│                                                              │
│    Digit 2 (Save):                                          │
│    - UPDATE voicemails SET listened = true                  │
│    - Move to next voicemail                                 │
│    - Say: "Message saved"                                   │
│                                                              │
│    Digit 3 (Next):                                          │
│    - No database update                                     │
│    - Move to next voicemail                                 │
│    - Say: "Next message"                                    │
│                                                              │
│    Digit 9 (Exit):                                          │
│    - Say: "Exiting voicemail"                               │
│    - Redirect to main menu                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Next Voicemail or Exit                                   │
│    - If more messages: Play next voicemail                  │
│    - If no more messages: "No more messages" + redirect     │
└─────────────────────────────────────────────────────────────┘
```

## Deployment

### 1. Deploy Edge Function

```powershell
cd C:\Users\maama\Downloads\skverho
supabase functions deploy check-voicemails-ivr --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt
```

**Verify deployment:**
```powershell
supabase functions list --project-ref wwopmopxgpdeqxuacagf
```

### 2. Configure IVR Menu

Run the SQL configuration in Supabase SQL Editor:

```sql
-- Execute CONFIGURE_ADMIN_MENU.sql
-- This adds option 3 (check voicemails) to admin menu
-- Also adds option 4 (email report)
```

**Verify configuration:**
```sql
SELECT 
  m.menu_name,
  m.menu_key,
  o.digit,
  o.option_name,
  o.function_name
FROM ivr_menus_v2 m
JOIN ivr_menu_options o ON o.menu_id = m.id
WHERE m.menu_key = 'admin'
ORDER BY o.digit;
```

Expected result:
```
menu_name   | menu_key | digit | option_name         | function_name
------------|----------|-------|---------------------|----------------------
Admin Menu  | admin    | 1     | Update Beds         | handle_bed_count
Admin Menu  | admin    | 2     | Update Meals        | handle_meal_count
Admin Menu  | admin    | 3     | Check Voicemails    | check_voicemails_ivr
Admin Menu  | admin    | 4     | Email Weekly Report | email_report_trigger
```

### 3. Test the System

**Step-by-step test:**

1. Call your Twilio number
2. Wait for main menu prompt
3. Press 8 (admin menu)
4. Enter admin password
5. Press 3 (check voicemails)
6. Listen to voicemail count announcement
7. Listen to first voicemail recording
8. Try each option:
   - Press 1 to delete → should move to next
   - Press 2 to save → should move to next
   - Press 3 to skip → should move to next
   - Press 9 to exit → should return to main menu

**Create test voicemail:**
```sql
-- Leave a test voicemail via frontend or by calling as a guest
-- Or insert manually for testing:
INSERT INTO voicemails (
  voicemail_box_id,
  caller_phone,
  caller_name,
  recording_url,
  duration,
  listened,
  created_at
)
SELECT 
  voicemail_box_id,
  '+1234567890',
  'Test Caller',
  'https://your-storage-url/test-recording.mp3',
  30,
  false,
  NOW()
FROM apartments WHERE id = 'your-apartment-id';
```

## Database Schema

### Voicemails Table
```sql
CREATE TABLE voicemails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voicemail_box_id UUID REFERENCES voicemail_boxes(id),
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  recording_url TEXT NOT NULL,
  duration INTEGER,
  listened BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Email tracking columns
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_recipients TEXT[]
);
```

### Key Columns Used
- `voicemail_box_id`: Links voicemail to apartment's mailbox
- `listened`: FALSE = unlistened (will be played), TRUE = listened/deleted
- `recording_url`: Full URL to MP3 file in Supabase Storage
- `caller_phone`: Used when caller_name is null
- `caller_name`: Displayed if available (from guests table)

## Hebrew Prompts

All prompts use Hebrew with Alice voice:

| English | Hebrew | Usage |
|---------|--------|-------|
| "You have X new messages" | "יש לך X הודעות חדשות" | Initial announcement |
| "First message from [name]" | "הודעה ראשונה מ [שם]" | Before playing |
| "Press 1 to delete" | "לחץ 1 למחוק הודעה זו" | Action options |
| "Press 2 to save" | "לחץ 2 לשמור" | Action options |
| "Press 3 for next message" | "לחץ 3 להודעה הבאה" | Action options |
| "Press 9 to exit" | "לחץ 9 לצאת" | Action options |
| "Message deleted" | "ההודעה נמחקה" | After deletion |
| "Message saved" | "ההודעה נשמרה" | After saving |
| "No more messages" | "אין עוד הודעות" | At end |
| "No new messages" | "אין הודעות חדשות" | When empty |

## Edge Function Details

### Request Body (from Twilio/IVR)
```typescript
{
  step: "initial" | "action",
  digits?: string,           // User's digit press (1,2,3,9)
  apartmentId: string,       // Current apartment UUID
  voicemailId?: string,      // Current voicemail UUID (in action step)
  voicemails?: Array,        // Full list of voicemails (passed through)
  totalCount?: number,       // Total voicemail count
  currentIndex?: number      // Current position in list
}
```

### Response Body
```typescript
{
  twiml: string,              // XML response for Twilio
  voicemailId?: string,       // Current voicemail UUID
  voicemails?: Array,         // Pass through for next step
  totalCount?: number,        // Pass through for next step
  currentIndex?: number       // Pass through for next step
}
```

### TwiML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="he-IL">יש לך 3 הודעות חדשות</Say>
  <Play>https://storage-url.com/voicemail.mp3</Play>
  <Gather action="https://supabase-url/check-voicemails-ivr" 
          method="POST" 
          numDigits="1" 
          timeout="5">
    <Say voice="alice" language="he-IL">לחץ 1 למחוק...</Say>
  </Gather>
</Response>
```

## Troubleshooting

### No Voicemail Box Found
**Error**: "לא נמצאה תיבת דואר קולי עבור דירה זו"

**Cause**: Apartment doesn't have a voicemail_box_id

**Fix**:
```sql
-- Create voicemail box for apartment
INSERT INTO voicemail_boxes (box_number, created_at)
VALUES (101, NOW())  -- Use apartment's actual box number
RETURNING id;

-- Link to apartment
UPDATE apartments
SET voicemail_box_id = 'box-uuid-from-above'
WHERE id = 'apartment-uuid';
```

### No Messages to Play
**Message**: "אין הודעות חדשות"

**Cause**: No voicemails with `listened = false`

**Fix**: Either leave a real voicemail or mark existing ones as unlistened:
```sql
UPDATE voicemails
SET listened = false
WHERE voicemail_box_id IN (
  SELECT voicemail_box_id FROM apartments WHERE id = 'your-apartment-id'
);
```

### Recording Doesn't Play
**Issue**: TwiML plays but no audio

**Causes**:
1. `recording_url` is NULL or invalid
2. Storage bucket permissions incorrect
3. Audio file not found

**Fix**:
```sql
-- Check recording URLs
SELECT id, recording_url, listened 
FROM voicemails 
WHERE voicemail_box_id = 'box-uuid'
AND listened = false;

-- Verify storage bucket is public
-- Supabase Dashboard → Storage → voicemail-recordings → Make bucket public
```

### Function Not Called
**Issue**: Pressing 3 doesn't trigger voicemail check

**Causes**:
1. IVR menu not configured
2. Function not deployed
3. Wrong function_name in options

**Debug**:
```sql
-- Check admin menu configuration
SELECT * FROM ivr_menu_options 
WHERE menu_id IN (SELECT id FROM ivr_menus_v2 WHERE menu_key = 'admin')
AND digit = '3';

-- Should show:
-- function_name = 'check_voicemails_ivr'
-- action_type = 'custom_function'
```

**Fix**: Run `CONFIGURE_ADMIN_MENU.sql` again

### Infinite Loop
**Issue**: Function keeps redirecting to itself

**Cause**: Invalid step or missing parameters

**Fix**: Check function logs in Supabase Dashboard → Edge Functions → check-voicemails-ivr → Logs

Look for errors in step handling or missing request body parameters.

## Security Considerations

1. **Admin Only**: Voicemail checking is behind admin password (digit 8)
2. **Apartment Isolation**: Function queries only the current apartment's voicemail box
3. **No JWT Verification**: Uses `--no-verify-jwt` because Twilio calls directly
4. **Service Role Key**: Function uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS

## Performance Notes

- **Query Optimization**: Fetches all unlistened voicemails once at start
- **Memory Usage**: Passes voicemail array through function calls (stateless)
- **Storage Access**: Each `<Play>` causes Twilio to download MP3 from Supabase Storage
- **Latency**: ~1-2 seconds per action due to database update + TwiML generation

## Future Enhancements

🔮 **Possible improvements:**

1. **Replay Option**: Add digit 7 to replay current message
2. **Save All**: Add digit 5 to mark all as read without listening
3. **Caller Filtering**: "Press 4 to hear only messages from guests"
4. **Timestamps**: Announce when each voicemail was received
5. **SMS Option**: "Press 6 to receive transcription via SMS"
6. **Mark Unread**: Add ability to un-mark messages as unread
7. **Archive System**: Instead of deleting, move to archived status

## Integration with Other Systems

### Email Notifications
When a voicemail is marked as listened via phone:
```typescript
// The voicemail's listened status is updated
// Email notification system (if configured) will not send for already-listened messages
// See VOICEMAIL_EMAIL_SYSTEM.md for email integration
```

### Frontend Voicemail Tab
- Frontend shows all voicemails (listened and unlistened)
- Phone system only shows unlistened (listened = false)
- When user deletes via phone, frontend will show listened = true
- Frontend has separate delete button that actually removes records

### Weekly Reports
- Voicemail count included in weekly reports
- See WEEKLY_REPORT_EMAIL_SYSTEM.md for report integration

## Cost Estimate

### Twilio
- **TwiML Request**: $0.0005 per request
- **Play Recording**: $0.004 per minute of playback
- **Gather Input**: $0.0005 per request

**Example**: 5 voicemails @ 1 minute each:
- Initial request: $0.0005
- Play 5 recordings: 5 × $0.004 = $0.02
- 5 gather prompts: 5 × $0.0005 = $0.0025
- **Total per session**: ~$0.023 (~8¢ per month for daily checks)

### Supabase
- **Edge Function Invocations**: Free tier = 500K/month
- **Storage Bandwidth**: Free tier = 5GB/month
- **Database Reads**: Included in free tier

## Summary

✅ Complete phone-based voicemail checking system  
✅ Integrated with existing IVR admin menu  
✅ Hebrew interface with intuitive options  
✅ Database updates for listened/deleted status  
✅ Graceful handling of no messages / end of list  
✅ Ready to deploy and test  

**Next Steps**:
1. Deploy `check-voicemails-ivr` edge function
2. Run `CONFIGURE_ADMIN_MENU.sql` in Supabase
3. Test by calling system and pressing 8 → password → 3
4. Verify voicemails play and actions work correctly
