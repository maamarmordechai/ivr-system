-- ADD MISSING AUDIO COLUMNS FOR PRIVATE PLACE QUESTION
-- Run this in Supabase SQL Editor to add the new audio columns

-- Add columns for "Private Place Question" (unregistered hosts)
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS host_unreg_private_audio_url TEXT;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS host_unreg_private_text TEXT DEFAULT 'איז אייער אכסניא א פריוואטע אכסניא, דרוקט 1. ס''איז ביי אייך אינדערהיים, דרוקט 2.';
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_host_unreg_private_audio BOOLEAN DEFAULT false;

-- Add columns for "Private Place Question" (during registration)
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS register_private_audio_url TEXT;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS register_private_text TEXT DEFAULT 'איז אייער אכסניא א פריוואטע אכסניא, דרוקט 1. ס''איז ביי אייך אינדערהיים, דרוקט 2.';
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_register_private_audio BOOLEAN DEFAULT false;

-- Add columns for "Final Message" (unregistered hosts)
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS host_unreg_final_audio_url TEXT;
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS host_unreg_final_text TEXT DEFAULT 'מיר וועלן אייך פערזענליך פארבינדן צו באשטעטיגן א גאסט לויט אייער באקוועמליכקייט.';
ALTER TABLE call_audio_config ADD COLUMN IF NOT EXISTS use_host_unreg_final_audio BOOLEAN DEFAULT false;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'call_audio_config' 
AND column_name LIKE '%private%' OR column_name LIKE '%unreg_final%'
ORDER BY column_name;
