-- Check the structure of weekly_bed_tracking table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'weekly_bed_tracking'
ORDER BY ordinal_position;
