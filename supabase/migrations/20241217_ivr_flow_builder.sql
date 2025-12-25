-- IVR Flow Builder System
-- Allows building custom IVR phone trees with audio prompts and DTMF actions

-- Drop if exists for clean rebuild
DROP TABLE IF EXISTS ivr_flow_actions CASCADE;
DROP TABLE IF EXISTS ivr_flow_steps CASCADE;
DROP TABLE IF EXISTS ivr_flows CASCADE;

-- Main IVR Flows table
CREATE TABLE ivr_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Only one flow can be default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVR Flow Steps (each step = one audio prompt/question)
CREATE TABLE ivr_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES ivr_flows(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_key TEXT NOT NULL, -- Unique key within flow
  step_order INTEGER DEFAULT 0,
  
  -- Audio prompt
  prompt_text TEXT, -- Text-to-speech fallback
  audio_url TEXT, -- Uploaded MP3 file URL
  use_audio BOOLEAN DEFAULT false,
  
  -- TTS settings
  voice_language TEXT DEFAULT 'he-IL', -- Hebrew default
  voice_name TEXT DEFAULT 'Polly.Dalia',
  
  -- Input settings
  timeout_seconds INTEGER DEFAULT 10,
  max_digits INTEGER DEFAULT 1,
  finish_on_key TEXT DEFAULT '#',
  
  -- Is this the entry point?
  is_entry_point BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(flow_id, step_key)
);

-- IVR Flow Actions (what happens when user presses a digit)
CREATE TABLE ivr_flow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES ivr_flow_steps(id) ON DELETE CASCADE,
  
  digit TEXT NOT NULL CHECK (digit IN ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#', 'timeout', 'invalid')),
  action_name TEXT NOT NULL,
  
  -- What action to take
  action_type TEXT NOT NULL CHECK (action_type IN (
    'goto_step',      -- Go to another step in this flow
    'voicemail',      -- Go to voicemail box
    'record',         -- Record caller's voice
    'transfer',       -- Transfer to phone number
    'hangup',         -- End call
    'repeat',         -- Repeat current step
    'callback',       -- Request callback
    'custom_function' -- Call a custom function
  )),
  
  -- Action parameters (depends on action_type)
  target_step_id UUID REFERENCES ivr_flow_steps(id) ON DELETE SET NULL, -- For goto_step
  voicemail_box_id UUID REFERENCES voicemail_boxes(id) ON DELETE SET NULL, -- For voicemail
  transfer_number TEXT, -- For transfer
  function_name TEXT, -- For custom_function
  
  -- Optional audio to play before action
  action_audio_url TEXT,
  action_audio_text TEXT,
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(step_id, digit)
);

-- Audio Library table (central storage for all audio files)
CREATE TABLE IF NOT EXISTS audio_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- 'ivr', 'voicemail', 'beds', 'meals', 'system'
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log table (unified reporting)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL, -- 'guest_accepted', 'host_signup', 'call_received', 'bed_response', 'meal_response'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  phone_number TEXT,
  related_id UUID, -- Reference to related record
  related_table TEXT, -- Name of related table
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ivr_flows_active ON ivr_flows(is_active);
CREATE INDEX idx_ivr_flow_steps_flow ON ivr_flow_steps(flow_id);
CREATE INDEX idx_ivr_flow_steps_entry ON ivr_flow_steps(is_entry_point);
CREATE INDEX idx_ivr_flow_actions_step ON ivr_flow_actions(step_id);
CREATE INDEX idx_ivr_flow_actions_digit ON ivr_flow_actions(digit);
CREATE INDEX idx_audio_library_category ON audio_library(category);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- RLS Policies
ALTER TABLE ivr_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivr_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivr_flow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can manage ivr_flows" ON ivr_flows
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage ivr_flow_steps" ON ivr_flow_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage ivr_flow_actions" ON ivr_flow_actions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage audio_library" ON audio_library
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage activity_log" ON activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read for edge functions
CREATE POLICY "Public can read ivr_flows" ON ivr_flows
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read ivr_flow_steps" ON ivr_flow_steps
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read ivr_flow_actions" ON ivr_flow_actions
  FOR SELECT TO anon USING (true);

-- Function to get full IVR flow structure
CREATE OR REPLACE FUNCTION get_ivr_flow_structure(p_flow_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'flow', row_to_json(f),
    'steps', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'step', row_to_json(s),
          'actions', (
            SELECT jsonb_agg(row_to_json(a) ORDER BY a.digit)
            FROM ivr_flow_actions a
            WHERE a.step_id = s.id AND a.is_active = true
          )
        ) ORDER BY s.step_order
      )
      FROM ivr_flow_steps s
      WHERE s.flow_id = f.id AND s.is_active = true
    )
  )
  INTO result
  FROM ivr_flows f
  WHERE f.id = p_flow_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert a sample IVR flow
INSERT INTO ivr_flows (name, description, is_active, is_default) VALUES
('Weekly Availability', 'Main IVR flow for weekly host availability calls', true, true);

-- Comments
COMMENT ON TABLE ivr_flows IS 'Main IVR phone tree definitions';
COMMENT ON TABLE ivr_flow_steps IS 'Individual steps/prompts in an IVR flow';
COMMENT ON TABLE ivr_flow_actions IS 'Actions triggered by DTMF digit presses';
COMMENT ON TABLE audio_library IS 'Central library of all audio files';
COMMENT ON TABLE activity_log IS 'Unified activity feed for all system events';
