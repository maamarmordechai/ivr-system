-- ===========================================
-- COMPLETE DATABASE SETUP FOR NEW FEATURES
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Fix RLS policy for voicemail_audio_prompts (for IVR audio tab)
DROP POLICY IF EXISTS "Allow authenticated users to insert voicemail audio prompts" ON voicemail_audio_prompts;
CREATE POLICY "Allow authenticated users to insert voicemail audio prompts"
  ON voicemail_audio_prompts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete voicemail audio prompts" ON voicemail_audio_prompts;
CREATE POLICY "Allow authenticated users to delete voicemail audio prompts"
  ON voicemail_audio_prompts FOR DELETE TO authenticated USING (true);

-- 2. Create IVR Flow Builder tables

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
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVR Flow Steps (each step = one audio prompt/question)
CREATE TABLE ivr_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES ivr_flows(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_key TEXT NOT NULL,
  step_order INTEGER DEFAULT 0,
  prompt_text TEXT,
  audio_url TEXT,
  use_audio BOOLEAN DEFAULT false,
  voice_language TEXT DEFAULT 'he-IL',
  voice_name TEXT DEFAULT 'Polly.Dalia',
  timeout_seconds INTEGER DEFAULT 10,
  max_digits INTEGER DEFAULT 1,
  finish_on_key TEXT DEFAULT '#',
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
  action_type TEXT NOT NULL CHECK (action_type IN (
    'goto_step', 'voicemail', 'record', 'transfer', 'hangup', 'repeat', 'callback', 'custom_function'
  )),
  target_step_id UUID REFERENCES ivr_flow_steps(id) ON DELETE SET NULL,
  voicemail_box_id UUID REFERENCES voicemail_boxes(id) ON DELETE SET NULL,
  transfer_number TEXT,
  function_name TEXT,
  action_audio_url TEXT,
  action_audio_text TEXT,
  action_data JSONB DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(step_id, digit)
);

-- 3. Audio Library table (central storage for all audio files)
CREATE TABLE IF NOT EXISTS audio_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Activity Log table (unified reporting)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  phone_number TEXT,
  related_id UUID,
  related_table TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS idx_ivr_flows_active ON ivr_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_ivr_flow_steps_flow ON ivr_flow_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_ivr_flow_steps_entry ON ivr_flow_steps(is_entry_point);
CREATE INDEX IF NOT EXISTS idx_ivr_flow_actions_step ON ivr_flow_actions(step_id);
CREATE INDEX IF NOT EXISTS idx_ivr_flow_actions_digit ON ivr_flow_actions(digit);
CREATE INDEX IF NOT EXISTS idx_audio_library_category ON audio_library(category);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- 6. Enable RLS
ALTER TABLE ivr_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivr_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivr_flow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage ivr_flows" ON ivr_flows;
CREATE POLICY "Authenticated users can manage ivr_flows" ON ivr_flows
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage ivr_flow_steps" ON ivr_flow_steps;
CREATE POLICY "Authenticated users can manage ivr_flow_steps" ON ivr_flow_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage ivr_flow_actions" ON ivr_flow_actions;
CREATE POLICY "Authenticated users can manage ivr_flow_actions" ON ivr_flow_actions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage audio_library" ON audio_library;
CREATE POLICY "Authenticated users can manage audio_library" ON audio_library
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage activity_log" ON activity_log;
CREATE POLICY "Authenticated users can manage activity_log" ON activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Public read access for edge functions
DROP POLICY IF EXISTS "Public can read ivr_flows" ON ivr_flows;
CREATE POLICY "Public can read ivr_flows" ON ivr_flows
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read ivr_flow_steps" ON ivr_flow_steps;
CREATE POLICY "Public can read ivr_flow_steps" ON ivr_flow_steps
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read ivr_flow_actions" ON ivr_flow_actions;
CREATE POLICY "Public can read ivr_flow_actions" ON ivr_flow_actions
  FOR SELECT TO anon USING (true);

-- 9. Insert a sample IVR flow to get started
INSERT INTO ivr_flows (name, description, is_active, is_default) VALUES
('Weekly Availability', 'Main IVR flow for weekly host availability calls', true, true)
ON CONFLICT DO NOTHING;

-- 10. Comments for documentation
COMMENT ON TABLE ivr_flows IS 'Main IVR phone tree definitions';
COMMENT ON TABLE ivr_flow_steps IS 'Individual steps/prompts in an IVR flow';
COMMENT ON TABLE ivr_flow_actions IS 'Actions triggered by DTMF digit presses';
COMMENT ON TABLE audio_library IS 'Central library of all audio files';
COMMENT ON TABLE activity_log IS 'Unified activity feed for all system events';

-- Success message
SELECT 'All tables and policies created successfully!' as status;
