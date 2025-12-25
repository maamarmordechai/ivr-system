-- FIX call_audio_config table - add missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS config_name TEXT DEFAULT 'weekly_availability';
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rows
UPDATE call_audio_config SET config_name = 'weekly_availability', is_active = true WHERE config_name IS NULL;

-- Verify
SELECT * FROM call_audio_config;
