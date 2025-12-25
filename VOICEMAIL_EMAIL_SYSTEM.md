# Voicemail Email Notification System

## Overview
Automatically send email notifications with MP3 attachments when voicemails arrive. Supports multiple recipients and per-box configuration.

## Features
✅ Automatic email on new voicemail
✅ MP3 recording attached
✅ Caller phone number and details
✅ Multiple email recipients
✅ Global + per-box email settings
✅ Tracking of sent emails

## Setup Steps

### 1. Run Database Migration

In Supabase SQL Editor, run:
```sql
-- File: supabase/migrations/20241209_add_voicemail_email_notifications.sql
```

This creates:
- `system_email_settings` table for global emails
- `email_notifications` column on `voicemail_boxes`
- Email tracking columns on `voicemails`
- Helper function `get_voicemail_email_recipients()`

### 2. Configure Resend API

1. Sign up at https://resend.com (free tier: 3,000 emails/month)
2. Get your API key
3. Add to Supabase Edge Function Secrets:

```powershell
# In Supabase Dashboard:
# Settings → Edge Functions → Secrets
# Add: RESEND_API_KEY = your_api_key_here
```

Or via CLI:
```powershell
supabase secrets set RESEND_API_KEY=your_api_key_here --project-ref wwopmopxgpdeqxuacagf
```

### 3. Update Email "From" Address

Edit `supabase/functions/send-voicemail-email/index.ts` line 168:

```typescript
from: 'Voicemail System <voicemail@yourdomain.com>',
```

Replace `voicemail@yourdomain.com` with your verified Resend sender.

### 4. Deploy Edge Functions

```powershell
# Deploy email sender function
supabase functions deploy send-voicemail-email --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt

# Redeploy voicemail handlers (updated to trigger emails)
supabase functions deploy handle-voicemail --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt
supabase functions deploy handle-host-name-recording --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt
```

### 5. Configure Email Recipients

**In System Settings Tab:**
1. Navigate to "System Settings"
2. Scroll to "Voicemail Email Notifications"
3. Add email addresses (these receive ALL voicemail notifications)
4. Click "Save Emails"

**Per-Box Configuration (Optional):**
You can also add specific emails per voicemail box by updating the database:

```sql
UPDATE voicemail_boxes 
SET email_notifications = ARRAY['specific@email.com', 'another@email.com']
WHERE box_number = '1';
```

## How It Works

### Flow Diagram
```
Voicemail Arrives
     ↓
handle-voicemail saves to database
     ↓
Triggers send-voicemail-email function
     ↓
Function fetches:
  - Global emails (system_email_settings)
  - Box-specific emails (voicemail_boxes.email_notifications)
     ↓
Downloads MP3 from Supabase Storage
     ↓
Sends email via Resend API with:
  - Caller details
  - Duration
  - Timestamp
  - MP3 attachment
     ↓
Updates voicemail record:
  - email_sent = true
  - email_sent_at = timestamp
  - email_recipients = [list of emails]
```

### Email Content

**Subject:**
```
New Voicemail from +1234567890 - Box 2
```

**Body includes:**
- Voicemail Box name and number
- Caller phone number
- Caller name (if provided)
- Duration (MM:SS)
- Received timestamp
- Transcription (if available)
- Play button link
- MP3 attachment

## Configuration Options

### Global Emails (All Voicemails)
```sql
-- View current global emails
SELECT * FROM system_email_settings WHERE setting_key = 'voicemail_notifications';

-- Update via System Settings UI or SQL:
UPDATE system_email_settings 
SET email_addresses = ARRAY['admin@example.com', 'support@example.com']
WHERE setting_key = 'voicemail_notifications';
```

### Per-Box Emails
```sql
-- Add emails to specific voicemail box
UPDATE voicemail_boxes 
SET email_notifications = ARRAY['box1@example.com']
WHERE box_number = '1';

-- View all box configurations
SELECT 
  box_number,
  box_name,
  email_notifications,
  get_voicemail_email_recipients(id) as all_recipients
FROM voicemail_boxes;
```

### Check Email Status
```sql
-- See which voicemails have emails sent
SELECT 
  v.id,
  v.caller_phone,
  v.created_at,
  v.email_sent,
  v.email_sent_at,
  v.email_recipients,
  vb.box_name
FROM voicemails v
JOIN voicemail_boxes vb ON v.voicemail_box_id = vb.id
ORDER BY v.created_at DESC
LIMIT 20;
```

## Testing

### Test Email Notification

1. **Leave a test voicemail:**
   - Call your Twilio number
   - Press digit for a voicemail box
   - Leave a message

2. **Check function logs:**
   ```
   Supabase Dashboard → Edge Functions → send-voicemail-email → Logs
   ```

3. **Verify email received:**
   - Check inbox
   - Confirm MP3 attachment
   - Test audio playback

4. **Check database:**
   ```sql
   SELECT * FROM voicemails 
   WHERE email_sent = true 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

### Manual Email Trigger

Test email sending without making a phone call:

```sql
-- Get a voicemail ID
SELECT id FROM voicemails ORDER BY created_at DESC LIMIT 1;

-- Trigger email via curl (replace YOUR_VOICEMAIL_ID and YOUR_SERVICE_KEY)
```

```powershell
$body = @{
    voicemailId = "YOUR_VOICEMAIL_ID"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://wwopmopxgpdeqxuacagf.supabase.co/functions/v1/send-voicemail-email" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

## Troubleshooting

### Emails Not Sending

**Check 1: RESEND_API_KEY configured?**
```powershell
# In Supabase Dashboard: Settings → Edge Functions → Secrets
# Should see RESEND_API_KEY listed
```

**Check 2: Function logs**
```
Supabase Dashboard → Edge Functions → send-voicemail-email → Logs
Look for errors like "RESEND_API_KEY not configured"
```

**Check 3: Email recipients configured?**
```sql
SELECT email_addresses FROM system_email_settings 
WHERE setting_key = 'voicemail_notifications';

-- Should return array with at least one email
```

### Email Sends But Not Received

**Check 1: Verify sender domain in Resend**
- Log into Resend dashboard
- Verify domain or use Resend testing domain

**Check 2: Check spam folder**

**Check 3: Resend logs**
- Log into https://resend.com
- Check delivery status

### MP3 Not Attached

**Issue:** Recording URL not accessible

**Solution:**
1. Check Supabase Storage bucket `voicemail-recordings` is PUBLIC
2. Verify recording URL in voicemails table is valid
3. Check function logs for download errors

```sql
-- Check recording URLs
SELECT id, recording_url, email_sent 
FROM voicemails 
WHERE recording_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

## Cost Estimates

### Resend Pricing
- Free tier: 3,000 emails/month
- Pro tier: $20/month for 50,000 emails
- Each email with MP3 attachment ≈ 200-500 KB

### Typical Usage
- 50 voicemails/month = 50 emails
- Well within free tier
- Multiple recipients don't count as separate sends

## Future Enhancements

**Possible additions:**
1. SMS notifications (via Twilio)
2. Webhook to external systems
3. Email templates per box
4. Notification preferences (immediate vs digest)
5. Reply-to functionality
6. Custom email branding

## Database Schema

### system_email_settings
```sql
id               UUID PRIMARY KEY
setting_key      TEXT UNIQUE (e.g., 'voicemail_notifications')
email_addresses  TEXT[] (array of emails)
is_active        BOOLEAN
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

### voicemail_boxes (added columns)
```sql
email_notifications  TEXT[] (box-specific emails)
```

### voicemails (added columns)
```sql
email_sent       BOOLEAN (was email sent?)
email_sent_at    TIMESTAMPTZ (when sent)
email_recipients TEXT[] (who received it)
```

## Summary

✅ **Database migration run** → Email tracking ready
✅ **Resend API configured** → Email sending works
✅ **Edge functions deployed** → Automatic triggering
✅ **UI updated** → Easy email management
✅ **Testing complete** → Emails arrive with MP3s

Your voicemail system now sends professional email notifications with recordings attached!
