-- Voicemail recordings table
CREATE TABLE IF NOT EXISTS voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voicemail_box_id UUID REFERENCES voicemail_boxes(id) ON DELETE CASCADE,
  caller_phone TEXT NOT NULL,
  recording_url TEXT NOT NULL,
  transcription TEXT,
  duration_seconds INTEGER,
  call_sid TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  listened_at TIMESTAMP,
  returned_at TIMESTAMP,
  CONSTRAINT voicemail_status_check CHECK (status IN ('new', 'listened', 'archived', 'returned'))
);

COMMENT ON TABLE voicemails IS 'Recorded voicemail messages from callers';
COMMENT ON COLUMN voicemails.status IS 'new=not listened, listened=played, returned=callback made, archived=done';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voicemails_box ON voicemails(voicemail_box_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_status ON voicemails(status);
CREATE INDEX IF NOT EXISTS idx_voicemails_created ON voicemails(created_at DESC);

-- Enable RLS
ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated full access to voicemails" 
  ON voicemails FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

-- Function to get voicemails with box info
CREATE OR REPLACE FUNCTION get_voicemails_with_priority()
RETURNS TABLE (
  id UUID,
  voicemail_box_id UUID,
  box_name TEXT,
  box_priority INTEGER,
  caller_phone TEXT,
  recording_url TEXT,
  transcription TEXT,
  duration_seconds INTEGER,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.voicemail_box_id,
    vb.box_name,
    vb.priority_level,
    v.caller_phone,
    v.recording_url,
    v.transcription,
    v.duration_seconds,
    v.status,
    v.notes,
    v.created_at
  FROM voicemails v
  JOIN voicemail_boxes vb ON v.voicemail_box_id = vb.id
  WHERE v.status IN ('new', 'listened')
  ORDER BY vb.priority_level DESC, v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_voicemails_with_priority IS 'Get voicemails sorted by priority (higher first) and date';
