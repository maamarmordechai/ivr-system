-- Update audio prompts to use 3 separate thank you messages
-- Remove old generic thank_you_callback and add specific ones

-- Delete old prompt if exists
DELETE FROM audio_prompts WHERE prompt_key IN ('thank_you_callback', 'option_yes', 'option_no', 'option_friday');

-- Insert new specific thank you prompts
INSERT INTO audio_prompts (prompt_key, prompt_name, description) VALUES
('thank_you_yes', 'Thank You - Accepted Guests', 'Thank you message after accepting guests and entering bed count'),
('thank_you_no', 'Thank You - Not Available', 'Thank you message when host is not available'),
('thank_you_friday', 'Thank You - Call Friday', 'Thank you message when asking to be called back on Friday')
ON CONFLICT (prompt_key) DO NOTHING;
