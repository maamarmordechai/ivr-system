# SQL Files to Run in Supabase

Go to your Supabase Dashboard → SQL Editor and run these files **in this order**:

## 1. Fix Apartment Deletion (REQUIRED FIRST)
**File:** `20241208_fix_apartment_deletion.sql`

This will:
- Drop old bed tracking tables that reference non-existent columns
- Fix incoming_calls foreign key constraint  
- Add is_active column to apartments
- Clean up old guest/assignment tables

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20241208_fix_apartment_deletion.sql
```

## 2. Create Bed Audio Settings
**File:** `CREATE_BED_AUDIO_TABLE.sql`

This will:
- Create bed_audio_settings table with 11 customizable prompts
- Support MP3 upload OR editable TTS text
- Enable placeholders like {bed_count} and {beds_remaining}

```sql
-- Copy and paste the entire contents of:
-- CREATE_BED_AUDIO_TABLE.sql
```

---

## After Running SQL Files

The new bed call flow will be active with:
- ✅ 4 options: Yes all / No / Partial / Call Friday
- ✅ Tells hosts their bed count from system
- ✅ Shows community need (beds remaining)
- ✅ MP3 audio support
- ✅ Editable TTS with dynamic placeholders
- ✅ Apartment deletion working

Test by calling your system as an existing host!
