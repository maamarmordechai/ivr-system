-- Add audio recording URLs to call_settings for ALL messages
ALTER TABLE call_settings
-- Outbound call messages
ADD COLUMN IF NOT EXISTS welcome_audio_url TEXT,
ADD COLUMN IF NOT EXISTS beds_audio_url TEXT,
ADD COLUMN IF NOT EXISTS couple_audio_url TEXT,
ADD COLUMN IF NOT EXISTS mix_audio_url TEXT,
ADD COLUMN IF NOT EXISTS two_couples_audio_url TEXT,
ADD COLUMN IF NOT EXISTS crib_audio_url TEXT,
ADD COLUMN IF NOT EXISTS assignment_success_audio_url TEXT,
ADD COLUMN IF NOT EXISTS no_match_audio_url TEXT,
ADD COLUMN IF NOT EXISTS invalid_beds_audio_url TEXT,
-- Incoming call messages (menu system)
ADD COLUMN IF NOT EXISTS menu_options_audio_url TEXT,
ADD COLUMN IF NOT EXISTS guest_registration_audio_url TEXT,
ADD COLUMN IF NOT EXISTS host_registration_audio_url TEXT,
ADD COLUMN IF NOT EXISTS not_registered_audio_url TEXT,
ADD COLUMN IF NOT EXISTS no_pending_audio_url TEXT,
ADD COLUMN IF NOT EXISTS no_input_audio_url TEXT,

-- Toggle flags for using audio vs TTS
ADD COLUMN IF NOT EXISTS use_welcome_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_beds_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_couple_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_mix_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_two_couples_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_crib_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_assignment_success_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_no_match_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_invalid_beds_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_menu_options_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_guest_registration_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_host_registration_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_not_registered_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_no_pending_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS use_no_input_audio BOOLEAN DEFAULT FALSE;

-- Comments for documentation
COMMENT ON COLUMN call_settings.welcome_audio_url IS 'MP3 URL for welcome message (outbound)';
COMMENT ON COLUMN call_settings.beds_audio_url IS 'MP3 URL for beds question (outbound)';
COMMENT ON COLUMN call_settings.couple_audio_url IS 'MP3 URL for couple question (outbound)';
COMMENT ON COLUMN call_settings.mix_audio_url IS 'MP3 URL for mixing question (outbound)';
COMMENT ON COLUMN call_settings.two_couples_audio_url IS 'MP3 URL for two couples question (outbound)';
COMMENT ON COLUMN call_settings.crib_audio_url IS 'MP3 URL for crib question (outbound)';
COMMENT ON COLUMN call_settings.assignment_success_audio_url IS 'MP3 URL for successful assignment message';
COMMENT ON COLUMN call_settings.no_match_audio_url IS 'MP3 URL for no matching guests message';
COMMENT ON COLUMN call_settings.invalid_beds_audio_url IS 'MP3 URL for invalid beds input message';
COMMENT ON COLUMN call_settings.menu_options_audio_url IS 'MP3 URL for main menu options (incoming)';
COMMENT ON COLUMN call_settings.guest_registration_audio_url IS 'MP3 URL for guest registration message';
COMMENT ON COLUMN call_settings.host_registration_audio_url IS 'MP3 URL for host registration message';
COMMENT ON COLUMN call_settings.not_registered_audio_url IS 'MP3 URL for not registered message';
COMMENT ON COLUMN call_settings.no_pending_audio_url IS 'MP3 URL for no pending guests message';
COMMENT ON COLUMN call_settings.no_input_audio_url IS 'MP3 URL for no input received message';

