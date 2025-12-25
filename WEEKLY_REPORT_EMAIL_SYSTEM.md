# Weekly Report Email System

## Overview
Automatically generate and send weekly accommodation reports via email. Reports include bed confirmations, meal confirmations, and **host addresses**. Can be triggered via:
- **Phone (digit 8)** - Call system and press 8
- **Frontend Button** - Click "Email Report" in Reports tab

## Features
✅ Professional HTML email report
✅ Includes host addresses in bed confirmations table
✅ Summary statistics (beds confirmed, meals, guests)
✅ Phone trigger (digit 8 in IVR)
✅ Frontend button in Reports tab
✅ Uses existing email system configuration
✅ Formatted for easy printing/saving

## Setup Steps

### 1. Deploy Edge Functions

```powershell
# Deploy report generator
supabase functions deploy send-weekly-report --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt

# Deploy phone trigger
supabase functions deploy email-report-trigger --project-ref wwopmopxgpdeqxuacagf --no-verify-jwt
```

### 2. Configure IVR Menu

Run this SQL in Supabase SQL Editor:
```sql
-- File: ADD_EMAIL_REPORT_TO_IVR.sql
```

This adds digit 8 to your IVR menu for email reports.

### 3. Test the System

**Via Phone:**
1. Call your Twilio number
2. Press 8 during the main menu
3. System says: "Your weekly report is being sent by email..."
4. Check your email inbox

**Via Frontend:**
1. Navigate to Reports tab
2. Click "Email Report" button
3. Toast notification confirms sending
4. Check your email inbox

## Report Contents

### Header
- Week dates (e.g., "December 9, 2025 - December 16, 2025")
- Beautiful gradient header with title

### Summary Cards
- Expected Guests count
- Beds Confirmed (of needed)
- Confirmation Rate percentage

### Admin Notes (if any)
- Displays any notes set by admin for the week

### Bed Confirmations Table
Columns:
- **Host Name** (from apartments.person_name)
- **Address** ⭐ NEW - Full host address
- **Phone** (clickable tel: link)
- **Beds** (green badge with count)
- **Confirmed** (date and time)
- **Via** (phone_call, sms, etc.)

Total: Shows sum of all confirmed beds

### Meal Confirmations Table
Columns:
- Host Name
- Phone
- Friday Night count
- Saturday Day count
- Responded timestamp

Total: Shows Friday and Saturday meal totals

### Footer
- Generation timestamp
- System branding

## Email Recipients

Uses the same email list as voicemail notifications:
- System Settings → Voicemail Email Notifications
- Any emails added there receive reports

Or specify custom recipients:
```javascript
// From frontend
await supabase.functions.invoke('send-weekly-report', {
  body: { 
    weekId: 'week-uuid-here',
    emailAddresses: ['custom@email.com', 'another@email.com']
  }
});
```

## Report Example

```
Subject: Weekly Accommodation Report - December 9, 2025

┌─────────────────────────────────────────────────┐
│  📊 Weekly Accommodation Report                 │
│  December 9, 2025 - December 16, 2025          │
└─────────────────────────────────────────────────┘

[Expected Guests]    [Beds Confirmed]    [Confirmation Rate]
       15                  13/30                  43%

🛏️ Bed Confirmations (4 hosts)
──────────────────────────────────────────────────
Host Name      | Address              | Phone        | Beds | Confirmed        | Via
Family gross   | 123 Main St         | 8453047962   | 4    | 12/8 10:45 PM   | phone_call
New Host       | 456 Oak Ave         | +18454997925 | 2    | 12/8 10:44 PM   | phone_call
New Host       | 789 Pine Rd         | +18452744026 | 2    | 12/8 9:19 PM    | phone_call
New Host       | 321 Elm Street      | +18455801234 | 5    | 12/8 7:57 PM    | phone_call

Total: 13 beds confirmed from 4 hosts

🍽️ Meal Confirmations (1 host)
──────────────────────────────────────────────────
Host Name      | Phone        | Friday Night | Saturday Day | Responded
New Host       | +18453762437 | 4           | -            | 12/8 5:23 PM

Friday Night: 4 meals  |  Saturday Day: 0 meals
```

## IVR Flow

**Caller experience:**
```
1. Caller dials Twilio number
2. Main menu plays
3. Caller presses 8
4. System: "Your weekly report is being sent by email. 
   You should receive it shortly. Goodbye."
5. Email arrives within seconds
```

## Frontend Integration

The Reports tab now has an "Email Report" button:

```jsx
<Button onClick={sendReportByEmail} className="bg-blue-600">
  <Mail className="w-4 h-4 mr-2" />
  Email Report
</Button>
```

Clicking triggers:
1. Calls `send-weekly-report` edge function
2. Shows toast notification
3. Email sent to configured recipients

## Database Queries

### Get current week report data
```sql
-- Week info
SELECT * FROM desperate_weeks 
WHERE week_end_date >= CURRENT_DATE 
ORDER BY week_start_date ASC 
LIMIT 1;

-- Bed confirmations with addresses
SELECT 
  bc.*,
  a.person_name,
  a.address,  -- ⭐ Address included
  a.phone_number
FROM bed_confirmations bc
JOIN apartments a ON bc.apartment_id = a.id
WHERE bc.week_id = 'current-week-id'
  AND bc.voided = false
ORDER BY bc.confirmed_at DESC;

-- Meal confirmations
SELECT 
  ma.*,
  mh.host_name,
  mh.phone_number
FROM meal_availabilities ma
JOIN meal_hosts mh ON ma.meal_host_id = mh.id
WHERE ma.week_id = 'current-week-id'
  AND ma.status = 'confirmed'
ORDER BY ma.responded_at DESC;
```

## Configuration

### Update "From" Address
Edit `supabase/functions/send-weekly-report/index.ts` line 302:
```typescript
from: 'Reports <onboarding@resend.dev>',
```

Change to your verified Resend domain when ready.

### Customize Report Styling
Edit the HTML template in `send-weekly-report/index.ts` starting at line 82.

CSS classes:
- `.header` - Top banner
- `.summary-card` - Stats cards
- `.section` - Each report section
- `.badge-success` - Green badges
- `.badge-info` - Blue badges

## Troubleshooting

### Email Not Received

**Check 1: Edge function logs**
```
Supabase Dashboard → Edge Functions → send-weekly-report → Logs
```

**Check 2: Email recipients configured?**
```sql
SELECT email_addresses FROM system_email_settings 
WHERE setting_key = 'voicemail_notifications';
```

**Check 3: Resend API key set?**
```
Dashboard → Settings → Edge Functions → Secrets
Should see: RESEND_API_KEY
```

### Phone Trigger Not Working

**Check IVR menu:**
```sql
SELECT * FROM ivr_menu_options 
WHERE digit = '8' AND function_name = 'email_report_trigger';
```

**Check function deployment:**
```powershell
supabase functions list --project-ref wwopmopxgpdeqxuacagf
# Should show: email-report-trigger
```

### Missing Addresses in Report

**Check apartments table:**
```sql
SELECT id, person_name, address 
FROM apartments 
WHERE address IS NULL OR address = '';
```

**Update missing addresses:**
```sql
UPDATE apartments 
SET address = '123 Main Street' 
WHERE id = 'apartment-id';
```

### Frontend Button Not Working

**Check browser console for errors**

**Verify function is deployed:**
```javascript
// Test in browser console
const { data, error } = await supabase.functions.invoke('send-weekly-report', {
  body: { weekId: 'your-week-id', emailAddresses: ['test@email.com'] }
});
console.log(data, error);
```

## Testing Checklist

- [ ] Deploy both edge functions
- [ ] Run ADD_EMAIL_REPORT_TO_IVR.sql
- [ ] Add test email in System Settings
- [ ] Call system and press 8
- [ ] Verify email received
- [ ] Check report includes addresses
- [ ] Test frontend "Email Report" button
- [ ] Verify email looks good on mobile
- [ ] Test with multiple recipients

## Future Enhancements

**Possible additions:**
1. PDF attachment (currently HTML email)
2. Weekly automatic scheduled reports
3. Custom date range selection
4. Excel/CSV export option
5. Report templates per box type
6. Email digest (daily/weekly summary)
7. Charts and graphs in email
8. Comparison to previous weeks

## Cost Estimate

- Resend free tier: 3,000 emails/month
- Report size: ~10-20 KB per email
- Typical usage: 5-10 reports/week
- **Well within free tier**

## Summary

✅ **Edge functions created**: send-weekly-report, email-report-trigger
✅ **Phone trigger added**: Digit 8 in IVR
✅ **Frontend button added**: Reports tab
✅ **Addresses included**: Full host addresses in table
✅ **Professional format**: HTML email with styling
✅ **Easy configuration**: Uses existing email settings

Your accommodation reports can now be sent instantly via phone or web interface!
