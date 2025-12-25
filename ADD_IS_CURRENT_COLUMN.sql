-- Add is_current column to desperate_weeks table
ALTER TABLE desperate_weeks
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_desperate_weeks_is_current 
ON desperate_weeks(is_current) 
WHERE is_current = true;

-- Set the most recent week as current (if none is set)
UPDATE desperate_weeks
SET is_current = true
WHERE id = (
  SELECT id 
  FROM desperate_weeks 
  WHERE week_end_date >= CURRENT_DATE
  ORDER BY week_start_date ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM desperate_weeks WHERE is_current = true
);

-- Verify
SELECT 
  dw.id, 
  dw.week_start_date, 
  dw.week_end_date, 
  dw.is_current,
  wbt.beds_needed,
  wbt.beds_confirmed
FROM desperate_weeks dw
LEFT JOIN weekly_bed_tracking wbt ON wbt.week_id = dw.id
ORDER BY dw.week_start_date DESC
LIMIT 5;
