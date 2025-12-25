-- Check what columns exist in weekly_bed_tracking
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'weekly_bed_tracking'
ORDER BY ordinal_position;
