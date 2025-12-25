-- Quick diagnostic - Run this to see what's missing
-- This will tell us exactly what needs to be fixed

-- Check if bed_audio_settings table exists
SELECT 
  'bed_audio_settings table' as check_item,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bed_audio_settings') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - Run CREATE_BED_AUDIO_TABLE.sql'
  END as status;

-- Check if bed_confirmations table exists
SELECT 
  'bed_confirmations table' as check_item,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bed_confirmations') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - Run COMPLETE_BED_SETUP.sql'
  END as status;

-- Check how many apartments want weekly calls
SELECT 
  'Apartments with wants_weekly_calls=true' as check_item,
  COUNT(*)::text || ' apartments' as status
FROM apartments 
WHERE wants_weekly_calls = true;

-- Check current week
SELECT 
  'Current week configured' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT FROM desperate_weeks 
      WHERE week_end_date >= CURRENT_DATE 
      ORDER BY week_start_date LIMIT 1
    )
    THEN '✅ YES' 
    ELSE '❌ NO - Need to create current week'
  END as status;

-- If bed_audio_settings exists, show count
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bed_audio_settings') THEN
    RAISE NOTICE 'Audio settings count: %', (SELECT COUNT(*) FROM bed_audio_settings);
  END IF;
END $$;
