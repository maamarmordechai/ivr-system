# Hebrew IVR Implementation Summary

## ✅ What's Done:

### 1. Language Infrastructure
- ✅ All 17 Edge Functions updated with `language="he-IL"` support
- ✅ Database setting `tts_language` added (currently set to `he-IL`)
- ✅ Frontend language toggle added in Settings tab

### 2. Functions Deployed
All functions now support Hebrew TTS via `language="he-IL"` attribute

## 📝 What You Need to Do:

### A. Update Text to Hebrew (3 Ways):

#### Option 1: Update Database Tables (RECOMMENDED - Easiest)
Update these tables with Hebrew text:

**1. IVR Menu Prompts:**
```sql
UPDATE ivr_menus_v2 
SET prompt_text = 'ברוכים הבאים למערכת האירוח' 
WHERE menu_key = 'main';
```

**2. IVR Options:**
```sql
UPDATE ivr_menu_options 
SET prompt_text = 'לחץ 1 למיטות' 
WHERE digit = '1';

UPDATE ivr_menu_options 
SET prompt_text = 'לחץ 2 לארוחות' 
WHERE digit = '2';
```

**3. Bed Audio Settings:**
```sql
UPDATE bed_audio_settings 
SET default_text = 'שלום, ברוך שובך' 
WHERE audio_key = 'existing_host_greeting';

UPDATE bed_audio_settings 
SET default_text = 'האם אתה זמין לספק מיטות השבוע? לחץ 1 לכן, כל המיטות זמינות. לחץ 2 לא, לא זמין. לחץ 3 רק חלק מהמיטות זמינות. לחץ 9 כדי שנתקשר אליך ביום שישי' 
WHERE audio_key = 'existing_host_prompt';
```

**4. Meal Audio Settings:**
```sql
UPDATE meal_audio_settings 
SET default_text = 'שלום, זה שיחת האישור השבועית לארוח ארוחות' 
WHERE audio_key = 'intro';
```

#### Option 2: Use Frontend IVR Builder
- Go to Settings → IVR Builder tab
- Edit each menu option's text to Hebrew
- The system will automatically use the Hebrew text

#### Option 3: I Can Update Function Code
- If you want hardcoded Hebrew fallbacks in the functions themselves
- Let me know and I'll update all fallback texts in the TypeScript files

### B. Language Toggle Usage:
1. Go to **Settings → General tab**
2. You'll see "IVR Language / שפת המערכת" dropdown
3. Select:
   - 🇮🇱 **Hebrew (עברית)** - for Hebrew voice
   - 🇺🇸 **English** - for English voice
4. Click "Save Settings"
5. **Important:** After changing language, update your IVR text prompts to match

### C. Numbers in English:
**Option 1 (Current):** Numbers will be pronounced in Hebrew with `language="he-IL"`
- "30" = "שלושים" (thirty in Hebrew)

**Option 2 (If you want English numbers):**
- Write numbers as Hebrew words in your prompts
- Example: Instead of "30", write "שלושים" or keep "30" for English pronunciation

**Option 3 (Mixed - requires code change):**
- I can modify functions to dynamically wrap numbers with `<lang xml:lang="en-US">` tags
- Hebrew text with English number pronunciation

## 🎯 Quick Start (5 minutes):

1. **Test Current Setup:**
   - Call your Twilio number
   - You'll hear Hebrew voice with English text (temporary)

2. **Update to Hebrew Text:**
   ```sql
   -- Run in Supabase SQL Editor
   UPDATE ivr_menus_v2 
   SET prompt_text = 'ברוכים הבאים למערכת האירוח. לחץ 1 למיטות. לחץ 2 לארוחות.' 
   WHERE menu_key = 'main';
   ```

3. **Call Again:**
   - You'll now hear Hebrew voice with Hebrew text! 🎉

## 📋 Reference Files:

- `HEBREW_TEXT_LOCATIONS.sql` - Complete list of all English text and Hebrew translations
- `NUMBER_LANGUAGE_NOTE.sql` - Guide for handling number pronunciation
- `ADD_HEBREW_TTS.sql` - Already applied to database ✅

## 🔄 Switching Back to English:

1. Go to Settings → General
2. Change language to "English"
3. Update IVR text prompts back to English
4. All done!

## ❓ Next Steps - Choose Your Path:

**Path A (Recommended):** Update database tables with Hebrew text
- Quickest, no code changes needed
- I've provided all translations in `HEBREW_TEXT_LOCATIONS.sql`

**Path B:** Let me update function code with Hebrew fallbacks
- More permanent, doesn't rely on database
- I'll add Hebrew text directly in TypeScript files

**Path C:** Use Frontend IVR Builder
- Most flexible, change anytime
- Update text visually in Settings tab

Which approach do you prefer?
