-- ===================================================================
-- UPDATE AUDIO SETTINGS FOR SPLIT PROMPTS AND FLOW CONTROL
-- ===================================================================
-- This migration adds:
-- 1. sequence_order - controls playback order
-- 2. flow_context - indicates when this prompt is used (new/update/both)
-- 3. Splits prompts that contain dynamic data into _before and _after variants

-- ===================================================================
-- 1. ADD NEW COLUMNS TO bed_audio_settings
-- ===================================================================

ALTER TABLE bed_audio_settings 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flow_context VARCHAR(20) DEFAULT 'both' CHECK (flow_context IN ('new', 'update', 'both'));

-- Add descriptions for clarity
COMMENT ON COLUMN bed_audio_settings.sequence_order IS 'Order in which this audio should play (0-999). Lower numbers play first.';
COMMENT ON COLUMN bed_audio_settings.flow_context IS 'When this audio is used: new (new confirmation), update (updating existing), both (always)';

-- ===================================================================
-- 2. ADD NEW COLUMNS TO meal_audio_settings
-- ===================================================================

ALTER TABLE meal_audio_settings 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flow_context VARCHAR(20) DEFAULT 'both' CHECK (flow_context IN ('new', 'update', 'both'));

COMMENT ON COLUMN meal_audio_settings.sequence_order IS 'Order in which this audio should play (0-999). Lower numbers play first.';
COMMENT ON COLUMN meal_audio_settings.flow_context IS 'When this audio is used: new (new confirmation), update (updating existing), both (always)';

-- ===================================================================
-- 3. INSERT NEW SPLIT AUDIO KEYS FOR BED SYSTEM
-- ===================================================================
-- Keys that need splitting (contain dynamic data):
-- - you_already_confirmed_beds (contains bed count)
-- - beds_update_question (shows old count)
-- - beds_enter_new_number (after saying old count)

-- Delete old keys that will be replaced with split versions
DELETE FROM bed_audio_settings WHERE audio_key IN (
  'you_already_confirmed_beds',
  'beds_update_question', 
  'beds_enter_new_number'
);

-- Insert split versions for "You already confirmed X beds"
INSERT INTO bed_audio_settings (audio_key, default_text, audio_url, sequence_order, flow_context) VALUES
('already_confirmed_before', 'You already confirmed', NULL, 10, 'update'),
('already_confirmed_after', 'beds this week.', NULL, 12, 'update');

-- Insert split versions for update question
INSERT INTO bed_audio_settings (audio_key, default_text, audio_url, sequence_order, flow_context) VALUES
('update_press1_keep0', 'Press 1 to update your confirmation, or press 0 to keep it.', NULL, 13, 'update');

-- Insert split versions for "You previously confirmed X beds"
INSERT INTO bed_audio_settings (audio_key, default_text, audio_url, sequence_order, flow_context) VALUES
('previously_confirmed_before', 'You previously confirmed', NULL, 20, 'update'),
('previously_confirmed_after', 'beds.', NULL, 22, 'update');

-- Insert split versions for new bed entry
INSERT INTO bed_audio_settings (audio_key, default_text, audio_url, sequence_order, flow_context) VALUES
('enter_new_bed_count', 'Please enter the new number of beds you can provide.', NULL, 23, 'update');

-- Update existing keys with proper sequence order and flow context
UPDATE bed_audio_settings SET sequence_order = 0, flow_context = 'both' WHERE audio_key = 'welcome_to_hosting';
UPDATE bed_audio_settings SET sequence_order = 1, flow_context = 'new' WHERE audio_key = 'we_are_looking_for_beds';
UPDATE bed_audio_settings SET sequence_order = 2, flow_context = 'new' WHERE audio_key = 'how_many_beds_can_you_provide';
UPDATE bed_audio_settings SET sequence_order = 30, flow_context = 'both' WHERE audio_key = 'thank_you_for_beds';
UPDATE bed_audio_settings SET sequence_order = 31, flow_context = 'new' WHERE audio_key = 'record_your_name';
UPDATE bed_audio_settings SET sequence_order = 40, flow_context = 'update' WHERE audio_key = 'beds_updated_from_to';
UPDATE bed_audio_settings SET sequence_order = 41, flow_context = 'update' WHERE audio_key = 'beds_cancelled';
UPDATE bed_audio_settings SET sequence_order = 50, flow_context = 'both' WHERE audio_key = 'no_response_goodbye';
UPDATE bed_audio_settings SET sequence_order = 100, flow_context = 'both' WHERE audio_key = 'error_try_again';

-- ===================================================================
-- 4. INSERT NEW SPLIT AUDIO KEYS FOR MEAL SYSTEM
-- ===================================================================
-- Keys that need splitting (contain dynamic data):
-- - you_already_confirmed_guests (contains guest description)
-- - meal_enter_new_count (after showing old count)

-- Delete old keys that will be replaced
DELETE FROM meal_audio_settings WHERE audio_key IN (
  'you_already_confirmed_guests',
  'meal_update_question',
  'meal_enter_new_count'
);

-- Insert split versions for "You already confirmed X guests"
INSERT INTO meal_audio_settings (audio_key, default_text, audio_url, sequence_order, flow_context) VALUES
('already_confirmed_guests_before', 'You already confirmed', NULL, 10, 'update'),
('already_confirmed_guests_after', 'for meals this week.', NULL, 12, 'update');

-- Insert split versions for update question
INSERT INTO meal_audio_settings (audio_key, default_text, audio_url, sequence_order, flow_context) VALUES
('meal_update_press1_keep0', 'Press 1 to update your confirmation, or press 0 to keep it.', NULL, 13, 'update');

-- Update existing keys with proper sequence order and flow context
UPDATE meal_audio_settings SET sequence_order = 0, flow_context = 'both' WHERE audio_key = 'intro';
UPDATE meal_audio_settings SET sequence_order = 1, flow_context = 'new' WHERE audio_key = 'guest_count_prompt';
UPDATE meal_audio_settings SET sequence_order = 2, flow_context = 'new' WHERE audio_key = 'meal_selection';
UPDATE meal_audio_settings SET sequence_order = 30, flow_context = 'both' WHERE audio_key = 'night_meal_only';
UPDATE meal_audio_settings SET sequence_order = 31, flow_context = 'both' WHERE audio_key = 'day_meal_only';
UPDATE meal_audio_settings SET sequence_order = 32, flow_context = 'both' WHERE audio_key = 'both_meals';
UPDATE meal_audio_settings SET sequence_order = 50, flow_context = 'both' WHERE audio_key = 'no_response_goodbye';
UPDATE meal_audio_settings SET sequence_order = 100, flow_context = 'both' WHERE audio_key = 'error_try_again';

-- ===================================================================
-- 5. VIEW UPDATED STRUCTURE
-- ===================================================================

-- View bed audio settings sorted by sequence
SELECT audio_key, default_text, sequence_order, flow_context, audio_url 
FROM bed_audio_settings 
ORDER BY sequence_order, audio_key;

-- View meal audio settings sorted by sequence
SELECT audio_key, default_text, sequence_order, flow_context, audio_url 
FROM meal_audio_settings 
ORDER BY sequence_order, audio_key;
