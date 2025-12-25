# Step-by-Step Twilio Setup Guide

## Part 1: Create Twilio Account & Get Phone Number

### Step 1: Sign Up for Twilio
1. Go to **https://www.twilio.com/try-twilio**
2. Click **"Sign up and start building"**
3. Fill in your details:
   - First & Last Name
   - Email
   - Password
4. Click **"Start your free trial"**

### Step 2: Verify Your Phone
1. Enter your personal phone number
2. Choose verification method (SMS or Call)
3. Enter the verification code you receive
4. Click **"Submit"**

### Step 3: Complete the Welcome Survey
1. Choose your role (e.g., "Developer")
2. Select your goal (choose "Voice & Video")
3. Select your experience level
4. Click **"Get Started"** or **"Skip to Dashboard"**

### Step 4: Get a Phone Number
1. You'll see a popup saying **"Get a trial phone number"**
2. Click **"Get a trial phone number"**
3. Twilio will assign you a free phone number
4. Click **"Choose this Number"**
5. **IMPORTANT**: Copy this number somewhere safe - you'll need it later
   - Format example: +1 234 567 8900
   - You need it in this format: **+12345678900** (no spaces)

### Step 5: Get Your Account Credentials
1. On the Twilio Console dashboard, you'll see:
   - **Account SID** (starts with "AC..." - about 34 characters)
   - **Auth Token** (click the eye icon 👁️ to reveal it)
2. **Copy both of these** - you'll need them in the next part

---

## Part 2: Add Twilio Credentials to Supabase

### Step 6: Go to Your Supabase Dashboard
1. Open **https://supabase.com/dashboard**
2. Select your project: **wwopmopxgpdeqxuacagf**
3. Click **"Project Settings"** (gear icon ⚙️ in the left sidebar)
4. Click **"Edge Functions"** in the settings menu

### Step 7: Add Secrets (Environment Variables)
1. Scroll down to **"Secrets"** section
2. Click **"Add new secret"**

**First Secret:**
- Name: `TWILIO_ACCOUNT_SID`
- Value: (paste your Account SID that starts with AC...)
- Click **"Create secret"**

**Second Secret:**
- Click **"Add new secret"** again
- Name: `TWILIO_AUTH_TOKEN`
- Value: (paste your Auth Token)
- Click **"Create secret"**

**Third Secret:**
- Click **"Add new secret"** again
- Name: `TWILIO_PHONE_NUMBER`
- Value: (paste your Twilio number in format: +12345678900)
- Click **"Create secret"**

### Step 8: Verify Your Test Phone Number (Trial Account Requirement)
Since you're on a trial account, you can ONLY call phone numbers you've verified.

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click the red **"+"** button
3. Enter the phone number you want to test calling (the apartment owner's phone)
4. Choose verification method (Call or SMS)
5. Enter the verification code
6. Repeat for any other phone numbers you want to test

---

## Part 3: Add Phone Number to Your Apartments

### Step 9: Add Phone Numbers to Database
1. Go to your Supabase dashboard
2. Click **"Table Editor"** in the left sidebar
3. Select the **"apartments"** table
4. Find an apartment you want to test with
5. Click on that row to edit it
6. Find the **"phone_number"** column
7. Enter a phone number in **E.164 format**: `+12345678900`
   - Must start with **+**
   - Country code (1 for US/Canada)
   - No spaces or dashes
   - Example: `+15551234567`
8. Click **"Save"** or press Enter
9. **IMPORTANT**: Make sure this phone number is verified in Twilio (Step 8)

---

## Part 4: Redeploy Your Edge Functions (Important!)

Since you added the secrets, you need to redeploy the functions so they can access them.

### Step 10: Redeploy Functions in Supabase
1. In Supabase dashboard, click **"Edge Functions"** in the left sidebar
2. Find the **"make-call"** function
3. Click the **"Deploy"** or **"Redeploy"** button
4. Wait for it to complete
5. Do the same for **"handle-call-response"** function

**Alternative: If you don't see a redeploy button:**
1. Click on the function name
2. Click **"Code"** tab
3. Click **"Deploy"** or look for deployment options

---

## Part 5: Test the Calling System

### Step 11: Open Your App in Browser
1. Make sure your dev server is running
   - If not, open PowerShell in your project folder
   - Run: `npm run dev`
2. Open your browser to: **http://localhost:3000**
3. Log in to your app

### Step 12: Test Making a Call
1. Navigate to the **Call System** in your app
2. Find the apartment that has a phone number
3. Click **"Make Call"**
4. You should see:
   - **"Calling..."** loading state
   - Then **"Call Initiated"** success message
5. The phone you added should start ringing! 📞

### Step 13: Answer the Call
1. Answer the phone call on the apartment owner's phone
2. You'll hear the automated message
3. The message will say something like:
   - "Hi [name], this is a call from Accommodation Management..."
   - "Press 1 to repeat this message"
4. Test pressing 1 to repeat

---

## Troubleshooting

### ❌ Error: "Twilio credentials not configured"
**Solution**: Go back to Step 7 and make sure all 3 secrets are added correctly

### ❌ Error: "The number is unverified" or "Number not verified"
**Solution**: Go back to Step 8 and verify the destination phone number in Twilio Console

### ❌ Error: "Failed to make call"
**Solution**: Check:
- Phone number is in E.164 format (+12345678900)
- No spaces or dashes in the phone number
- You have credit in your Twilio account (check Twilio Console)

### ❌ Call doesn't happen
**Solution**: 
1. Check browser console (F12) for errors
2. Check Supabase Edge Function logs:
   - Go to Supabase Dashboard → Edge Functions
   - Click on "make-call" function
   - Click "Logs" tab
   - Look for error messages

### ❌ "Make Call" button doesn't appear
**Solution**: Make sure the apartment has a phone_number value in the database

---

## Quick Reference

### Your Twilio Info (fill this in):
- Account SID: AC_______________________
- Auth Token: ________________________
- Phone Number: +_____________________

### Phone Number Format Examples:
- ✅ CORRECT: `+15551234567`
- ✅ CORRECT: `+12125551234`
- ❌ WRONG: `555-123-4567`
- ❌ WRONG: `+1 555 123 4567`
- ❌ WRONG: `15551234567` (missing +)

### Free Trial Limits:
- $15.50 in free credit
- ~600-1200 minutes of calls
- Can only call verified numbers
- One free phone number included

---

## Next Steps After Testing

1. **Add more phone numbers** to your apartments table
2. **Verify those numbers** in Twilio Console
3. **Test calling multiple apartments**
4. **View call history** in your database (call_history table)
5. **Monitor calls** in Twilio Console → Monitor → Logs → Calls

---

## Need More Help?

- **Twilio Console**: https://console.twilio.com
- **Your Supabase Project**: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf
- **Check function logs** in Supabase Dashboard → Edge Functions → make-call → Logs
