-- Add call automation fields to apartments table
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS call_frequency TEXT DEFAULT 'weekly' CHECK (call_frequency IN ('weekly', 'biweekly', 'desperate')),
ADD COLUMN IF NOT EXISTS last_called_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_accepted_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS call_priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_this_week BOOLEAN DEFAULT false;

-- Create call_history table for tracking outbound calls
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  call_sid TEXT,
  call_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response TEXT CHECK (response IN ('available', 'not_available', 'call_back_friday', 'partially_available', 'no_response')),
  beds_offered INTEGER,
  guests_assigned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_call_history_apartment ON call_history(apartment_id);
CREATE INDEX IF NOT EXISTS idx_call_history_date ON call_history(call_date);
CREATE INDEX IF NOT EXISTS idx_apartments_call_priority ON apartments(call_priority, last_called_date);

-- Add comment explaining the call_frequency values
COMMENT ON COLUMN apartments.call_frequency IS 
  'weekly: Call every week, biweekly: Call every 2 weeks, desperate: Only call when no other options available';
