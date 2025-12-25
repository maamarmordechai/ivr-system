-- PLACES TO CHANGE TO HEBREW TEXT
-- Run these queries to see all English text that needs Hebrew translation

-- 1. IVR Menu Prompts (Main Menu)
SELECT id, menu_key, menu_name, prompt_text 
FROM ivr_menus_v2 
WHERE menu_key = 'main';
-- Change: prompt_text to Hebrew
-- This is the main greeting: "Welcome... Press 1 for... Press 2 for..."

-- 2. IVR Menu Options (No prompt_text - only option names)
SELECT id, digit, option_name, action_type 
FROM ivr_menu_options 
WHERE is_active = true
ORDER BY digit;
-- Note: Options don't have individual prompts - the menu prompt_text announces all options
-- You only need to translate option_name for display purposes (not spoken)

-- 3. Bed Audio Settings
SELECT audio_key, default_text 
FROM bed_audio_settings 
WHERE is_active = true;
-- Change: default_text to Hebrew
-- Keys: existing_host_greeting, existing_host_beds_info, beds_needed_prompt, 
--       existing_host_prompt, welcome_message, new_host_prompt, thank_you_message,
--       partial_beds_prompt, callback_friday_confirm

-- 4. Meal Audio Settings
SELECT audio_key, default_text 
FROM meal_audio_settings 
WHERE is_active = true;
-- Change: default_text to Hebrew
-- Keys: intro, guest_count_prompt, meal_selection, thank_you,
--       night_meal_only, day_meal_only, both_meals

-- 5. Hardcoded English Text in Functions (to change manually or via database):
-- These are fallback texts when database settings don't exist:

-- incoming-call/index.ts:
-- "Welcome to the accommodation system." → "ברוכים הבאים למערכת האירוח"
-- "We didn't receive your response. Goodbye." → "לא קיבלנו את תשובתך. להתראות"
-- "Sorry, there was an error. Please try again later." → "סליחה, הייתה שגיאה. אנא נסה שוב מאוחר יותר"

-- open-call-system/index.ts:
-- "Sorry, no current week configured. Please contact the administrator." → "סליחה, אין שבוע נוכחי מוגדר. אנא צור קשר עם המנהל"
-- "Hello, welcome back." → "שלום, ברוך שובך"
-- "Our records show you have {bed_count} beds available." → "הרשומות שלנו מראות שיש לך {bed_count} מיטות זמינות"
-- "We are looking for {beds_remaining} beds this week." → "אנחנו מחפשים {beds_remaining} מיטות השבוע"
-- "Are you available to provide beds this week? Press 1 for yes, all beds available. Press 2 for no, not available. Press 3 for only some beds available. Press 9 to call me back on Friday." → "האם אתה זמין לספק מיטות השבוע? לחץ 1 לכן, כל המיטות זמינות. לחץ 2 לא, לא זמין. לחץ 3 רק חלק מהמיטות זמינות. לחץ 9 כדי שנתקשר אליך ביום שישי"
-- "Welcome to the accommodation system." → "ברוכים הבאים למערכת האירוח"
-- "How many beds can you provide? Enter a number now." → "כמה מיטות אתה יכול לספק? הזן מספר עכשיו"
-- "We did not receive your response. Goodbye." → "לא קיבלנו את תשובתך. להתראות"

-- handle-meal-call/index.ts:
-- "Hello, this is the weekly meal hosting confirmation call." → "שלום, זה שיחת האישור השבועית לארוח ארוחות"
-- "We are looking for hosts for guests this Shabbat. How many guests can you host? Press 0 if you cannot host this week." → "אנחנו מחפשים מארחים לאורחים בשבת זו. כמה אורחים אתה יכול לארח? לחץ 0 אם אינך יכול לארח השבוע"
-- "Press a digit now." → "לחץ על ספרה עכשיו"
-- "We did not receive your response. Goodbye." → "לא קיבלנו את תשובתך. להתראות"

-- handle-meal-response/index.ts:
-- "We understand you cannot host this week. Thank you." → "אנחנו מבינים שאינך יכול לארח השבוע. תודה"

-- handle-new-host/index.ts:
-- "Invalid number. Please call back and try again." → "מספר לא חוקי. אנא התקשר שוב ונסה שוב"
-- "Thank you for offering {bedCount} bed(s) this week." → "תודה על הצעת {bedCount} מיטות השבוע"
-- "Please record your name after the beep so we can contact you." → "אנא הקלט את שמך אחרי הצפצוף כדי שנוכל ליצור איתך קשר"

-- handle-host-response/index.ts:
-- "Error finding your information. Please try again." → "שגיאה במציאת המידע שלך. אנא נסה שוב"
-- "We did not receive your response. Goodbye." → "לא קיבלנו את תשובתך. להתראות"
-- "Sorry, that's not a valid option." → "סליחה, זו לא אפשרות תקפה"

-- handle-partial-beds/index.ts:
-- "Sorry, that's not a valid number." → "סליחה, זה לא מספר תקף"

-- handle-host-update-beds/index.ts:
-- "Invalid number. Please call back and try again." → "מספר לא חוקי. אנא התקשר שוב ונסה שוב"
-- "Thank you for letting us know you cannot help this week." → "תודה שהודעת לנו שאינך יכול לעזור השבוע"
-- "Thank you for confirming {bedCount} bed(s). We appreciate your help." → "תודה על אישור {bedCount} מיטות. אנחנו מעריכים את העזרה שלך"
-- "Thank you. Goodbye." → "תודה. להתראות"

-- handle-ivr-selection/index.ts:
-- "Sorry, that's not a valid option. Please try again." → "סליחה, זו לא אפשרות תקפה. אנא נסה שוב"
-- "Please leave a message after the beep." → "אנא השאר הודעה אחרי הצפצוף"
-- "Thank you for your message. Goodbye." → "תודה על ההודעה שלך. להתראות"
-- "Sorry, no current week configured. Goodbye." → "סליחה, אין שבוע נוכחי מוגדר. להתראות"
-- "Please enter the 4 digit admin password." → "אנא הזן את סיסמת המנהל בת 4 ספרות"
-- "No password entered. Goodbye." → "לא הוזנה סיסמה. להתראות"
-- "Do you have beds available for guests this week?" → "האם יש לך מיטות פנויות לאורחים השבוע?"
-- "Press 1 if yes, you have beds available." → "לחץ 1 אם כן, יש לך מיטות זמינות"
-- "Press 2 if no, you don't have beds available." → "לחץ 2 אם לא, אין לך מיטות זמינות"

-- handle-admin-menu/index.ts:
-- "Incorrect password. Access denied." → "סיסמה שגויה. גישה נדחתה"
-- "Admin access granted." → "גישת מנהל ניתנה"
-- "Press 1 to manage beds." → "לחץ 1 לניהול מיטות"
-- "Press 2 to manage meals." → "לחץ 2 לניהול ארוחות"
-- "No selection made. Goodbye." → "לא נעשתה בחירה. להתראות"

-- handle-admin-selection/index.ts:
-- "No current week configured. Goodbye." → "אין שבוע נוכחי מוגדר. להתראות"
-- "Bed management for this week." → "ניהול מיטות לשבוע זה"
-- "We are looking for {beds_needed} beds." → "אנחנו מחפשים {beds_needed} מיטות"
-- "We have already confirmed {beds_confirmed} beds." → "כבר אישרנו {beds_confirmed} מיטות"
-- "We still need {beds_remaining} beds." → "אנחנו עדיין צריכים {beds_remaining} מיטות"
-- "Press 1 to update the number of beds needed." → "לחץ 1 לעדכון מספר המיטות הדרושות"
-- "Press 2 to send calls now." → "לחץ 2 לשלוח שיחות עכשיו"
-- "No action taken. Goodbye." → "לא בוצעה פעולה. להתראות"
-- "Meal management for this week." → "ניהול ארוחות לשבוע זה"
-- "We are looking for {meals_needed} meals." → "אנחנו מחפשים {meals_needed} ארוחות"
-- "Friday night: {count} confirmed." → "ליל שישי: {count} אושרו"
-- "Saturday day: {count} confirmed." → "יום שבת: {count} אושרו"

-- handle-admin-beds-action/index.ts:
-- "Enter the number of beds needed this week." → "הזן את מספר המיטות הדרושות השבוע"
-- "No number entered. Goodbye." → "לא הוזן מספר. להתראות"
-- "Press 1 to confirm sending calls to all hosts now." → "לחץ 1 לאישור שליחת שיחות לכל המארחים עכשיו"
-- "Calls not sent. Goodbye." → "שיחות לא נשלחו. להתראות"

-- handle-admin-update-beds/index.ts:
-- "Invalid number. Please try again. Goodbye." → "מספר לא חוקי. אנא נסה שוב. להתראות"
-- "Beds needed updated to {bedsNeeded}." → "מספר המיטות הנדרשות עודכן ל-{bedsNeeded}"
-- "Press 1 to send calls now. Press 2 to skip." → "לחץ 1 לשלוח שיחות עכשיו. לחץ 2 לדלג"
-- "Thank you. Goodbye." → "תודה. להתראות"

-- handle-admin-send-calls/index.ts:
-- "Calls not sent. Goodbye." → "שיחות לא נשלחו. להתראות"

-- handle-weekly-calls-preference/index.ts:
-- "You will receive weekly calls." / "You will not receive weekly calls." → "תקבל שיחות שבועיות" / "לא תקבל שיחות שבועיות"
-- "Thank you for registering. We will contact you soon. Goodbye." → "תודה על ההרשמה. ניצור איתך קשר בקרוב. להתראות"

-- handle-host-name-recording/index.ts:
-- "Would you like to receive a call every week to confirm availability?" → "האם תרצה לקבל שיחה כל שבוע לאישור זמינות?"
-- "Press 1 for yes, press 2 for no." → "לחץ 1 לכן, לחץ 2 לא"
-- "Thank you for registering. Goodbye." → "תודה על ההרשמה. להתראות"

-- handle-voicemail/index.ts:
-- "Thank you. Goodbye." → "תודה. להתראות"

-- 6. EASIEST APPROACH:
-- Update the database tables (bed_audio_settings, meal_audio_settings, ivr_menus_v2, ivr_menu_options)
-- with Hebrew text. The functions will automatically use them!

-- 7. For error messages and fallback text, I can help you update the functions if needed.
