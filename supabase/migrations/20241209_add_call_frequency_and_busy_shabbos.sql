-- Add comprehensive call frequency options and busy Shabbos trigger system

-- Update call_frequency to support 4 options
ALTER TABLE apartments DROP CONSTRAINT IF EXISTS apartments_call_frequency_check;
ALTER TABLE apartments ADD CONSTRAINT apartments_call_frequency_check 
  CHECK (call_frequency IN ('weekly', 'bi-weekly', 'monthly', 'desperate-only', 'never'));

COMMENT ON COLUMN apartments.call_frequency IS 'Call frequency: weekly, bi-weekly (every 2 weeks), monthly (every 4 weeks), desperate-only (only busy weeks), never';

-- Add last_called_date if not exists
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS last_called_date DATE;

COMMENT ON COLUMN apartments.last_called_date IS 'Date when apartment was last called for availability';

-- Update desperate_weeks to include trigger functionality
ALTER TABLE desperate_weeks ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE desperate_weeks ADD COLUMN IF NOT EXISTS triggered_by TEXT;
ALTER TABLE desperate_weeks ADD COLUMN IF NOT EXISTS calls_made INTEGER DEFAULT 0;

COMMENT ON COLUMN desperate_weeks.triggered_at IS 'When the busy Shabbos call campaign was triggered';
COMMENT ON COLUMN desperate_weeks.triggered_by IS 'Admin user who triggered the campaign';
COMMENT ON COLUMN desperate_weeks.calls_made IS 'Number of calls made for this busy week';

-- Create function to determine if apartment should be called this week
CREATE OR REPLACE FUNCTION should_call_apartment(
  apt_id UUID,
  target_week_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  apt RECORD;
  weeks_since_last_call INTEGER;
  is_busy_week BOOLEAN;
BEGIN
  -- Get apartment details
  SELECT * INTO apt FROM apartments WHERE id = apt_id;
  
  IF NOT FOUND OR apt.call_frequency = 'never' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this is a busy week
  SELECT EXISTS(
    SELECT 1 FROM desperate_weeks 
    WHERE week_start_date <= target_week_date 
      AND week_end_date >= target_week_date
      AND is_desperate = true
  ) INTO is_busy_week;
  
  -- If call_frequency is 'desperate-only', only call on busy weeks
  IF apt.call_frequency = 'desperate-only' THEN
    RETURN is_busy_week;
  END IF;
  
  -- For busy weeks, call everyone except 'never' (already handled above)
  IF is_busy_week THEN
    RETURN TRUE;
  END IF;
  
  -- Calculate weeks since last call
  IF apt.last_called_date IS NULL THEN
    RETURN TRUE; -- Never called before
  END IF;
  
  weeks_since_last_call := FLOOR((target_week_date - apt.last_called_date) / 7);
  
  -- Apply frequency rules
  CASE apt.call_frequency
    WHEN 'weekly' THEN
      RETURN weeks_since_last_call >= 1;
    WHEN 'bi-weekly' THEN
      RETURN weeks_since_last_call >= 2;
    WHEN 'monthly' THEN
      RETURN weeks_since_last_call >= 4;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION should_call_apartment IS 'Determines if an apartment should be called this week based on frequency and busy status';

-- Create function to get all apartments to call for a specific week
CREATE OR REPLACE FUNCTION get_apartments_to_call(target_week_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  apartment_id UUID,
  person_name TEXT,
  phone_number TEXT,
  number_of_beds INTEGER,
  call_frequency TEXT,
  last_called_date DATE,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.person_name,
    a.phone_number,
    a.number_of_beds,
    a.call_frequency,
    a.last_called_date,
    CASE 
      WHEN EXISTS(SELECT 1 FROM desperate_weeks WHERE week_start_date <= target_week_date AND week_end_date >= target_week_date AND is_desperate = true) 
        THEN 'Busy Shabbos'
      WHEN a.last_called_date IS NULL THEN 'First call'
      ELSE a.call_frequency
    END as reason
  FROM apartments a
  WHERE should_call_apartment(a.id, target_week_date)
    AND a.phone_number IS NOT NULL
    AND a.phone_number != ''
  ORDER BY 
    a.call_frequency = 'desperate-only' DESC, -- Desperate-only hosts first on busy weeks
    a.last_called_date ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_apartments_to_call IS 'Returns list of apartments to call for a specific week';

-- Create function to trigger busy Shabbos campaign
CREATE OR REPLACE FUNCTION trigger_busy_shabbos_campaign(
  target_week_date DATE,
  admin_user TEXT DEFAULT 'system'
) RETURNS TABLE (
  week_id UUID,
  apartments_count INTEGER,
  message TEXT
) AS $$
DECLARE
  week_record RECORD;
  apt_count INTEGER;
BEGIN
  -- Find or create the desperate week
  SELECT * INTO week_record
  FROM desperate_weeks
  WHERE week_start_date <= target_week_date 
    AND week_end_date >= target_week_date
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Create the desperate week entry
    INSERT INTO desperate_weeks (week_start_date, week_end_date, is_desperate)
    VALUES (
      target_week_date - EXTRACT(DOW FROM target_week_date)::INTEGER + 5, -- Friday
      target_week_date - EXTRACT(DOW FROM target_week_date)::INTEGER + 6, -- Saturday
      true
    )
    RETURNING * INTO week_record;
  ELSE
    -- Update existing week to mark as desperate
    UPDATE desperate_weeks
    SET is_desperate = true,
        triggered_at = NOW(),
        triggered_by = admin_user
    WHERE id = week_record.id
    RETURNING * INTO week_record;
  END IF;
  
  -- Count apartments that will be called
  SELECT COUNT(*) INTO apt_count
  FROM get_apartments_to_call(target_week_date);
  
  -- Update calls_made counter
  UPDATE desperate_weeks
  SET calls_made = apt_count
  WHERE id = week_record.id;
  
  RETURN QUERY
  SELECT 
    week_record.id,
    apt_count,
    'Busy Shabbos campaign triggered for ' || apt_count || ' apartments';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_busy_shabbos_campaign IS 'Admin function to trigger a busy Shabbos call campaign';

-- Create view for admin dashboard
CREATE OR REPLACE VIEW call_campaign_overview AS
SELECT 
  dw.id as week_id,
  dw.week_start_date,
  dw.week_end_date,
  dw.parsha_name,
  dw.is_desperate,
  dw.triggered_at,
  dw.triggered_by,
  (SELECT COUNT(*) FROM get_apartments_to_call(dw.week_start_date)) as apartments_to_call,
  (SELECT COUNT(*) FROM apartments WHERE call_frequency = 'weekly') as weekly_count,
  (SELECT COUNT(*) FROM apartments WHERE call_frequency = 'bi-weekly') as biweekly_count,
  (SELECT COUNT(*) FROM apartments WHERE call_frequency = 'monthly') as monthly_count,
  (SELECT COUNT(*) FROM apartments WHERE call_frequency = 'desperate-only') as desperate_only_count
FROM desperate_weeks dw
ORDER BY dw.week_start_date DESC;

COMMENT ON VIEW call_campaign_overview IS 'Overview of calling campaigns by week';
