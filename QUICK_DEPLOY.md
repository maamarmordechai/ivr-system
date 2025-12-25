# ⚡ QUICK DEPLOY - 5 Minutes

## 1️⃣ Database (2 minutes)

Open Supabase Dashboard → SQL Editor

### Copy and run these 2 files (in order):

**First:**
```
supabase/migrations/20241204_add_voicemail_system.sql
```

**Second:**
```
supabase/migrations/20241204_add_ivr_builder.sql
```

Click "RUN" for each one.

---

## 2️⃣ Edge Functions (3 minutes)

Open terminal in your project:

```powershell
cd supabase

# Deploy all 4 functions
supabase functions deploy incoming-call
supabase functions deploy handle-ivr-menu
supabase functions deploy handle-voicemail-recording
supabase functions deploy handle-menu-selection
```

---

## 3️⃣ Test (30 seconds)

1. Call your Twilio number
2. Press 0 to leave a voicemail
3. Open your app → **Voicemails** tab
4. See your message!

---

## 4️⃣ Customize (As long as you want!)

Open your app → **IVR Builder** tab

- Click "Main Menu"
- Click "Edit Menu"
- Change greeting text
- Click "Save Menu"
- Call again - hear your new greeting!

---

## ✅ Done!

You now have:
- ✅ Multi-level IVR system
- ✅ Voicemail with transcription
- ✅ Visual IVR builder
- ✅ 100% customizable via UI

See **VOICEMAIL_DEPLOYMENT.md** for detailed docs.
See **IVR_BUILDER_GUIDE.md** for how to use the builder.
See **IVR_SYSTEM_COMPLETE.md** for full technical details.
