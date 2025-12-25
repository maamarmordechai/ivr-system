-- Add descriptions to all IVR functions for the dropdown menu
-- This helps admins understand what each function does

-- Create a function_descriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS ivr_function_descriptions (
  function_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ivr_function_descriptions IS 'Descriptions of all available IVR functions for admin interface';

-- Insert all function descriptions
INSERT INTO ivr_function_descriptions (function_name, display_name, description, category)
VALUES
  ('beds', 'Manage Guest Beds', 'Allows hosts to update bed availability for the current week. Asks how many beds are available and records the response.', 'Host Management'),
  ('meals', 'Manage Shabbat Meals', 'Allows hosts to specify meal availability (Friday dinner, Shabbat lunch). Used for matching guests with meal hosts.', 'Host Management'),
  ('register_host', 'Register as Host', 'Complete registration flow for new hosts. Collects: number of beds, name recording, call frequency preference (weekly/bi-weekly/monthly/desperate-only), and private entrance info.', 'Registration'),
  ('register_meal_host', 'Register for Meal Hosting', 'Registration specifically for meal-only hosts. For people who can host meals but not overnight guests.', 'Registration'),
  ('guest_registration', 'Guest Registration', 'Guest registration flow. Collects guest information and accommodation needs.', 'Registration'),
  ('check_host_availability', 'Check Host Availability', 'Internal function to check if a host has available beds for the current week.', 'Internal'),
  ('trigger_busy_campaign', 'Trigger Busy Shabbos Campaign', 'ADMIN ONLY: Triggers emergency calls to ALL hosts (including desperate-only) for busy Shabbos weeks. Requires confirmation before executing.', 'Admin'),
  ('admin', 'Administrative Functions', 'Access to administrative functions and system management.', 'Admin')
ON CONFLICT (function_name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Create view for the dropdown menu with descriptions
CREATE OR REPLACE VIEW ivr_functions_dropdown AS
SELECT 
  function_name,
  display_name,
  description,
  category,
  is_active
FROM ivr_function_descriptions
WHERE is_active = true
ORDER BY 
  CASE category
    WHEN 'Registration' THEN 1
    WHEN 'Host Management' THEN 2
    WHEN 'Admin' THEN 3
    WHEN 'Internal' THEN 4
    ELSE 5
  END,
  display_name;

COMMENT ON VIEW ivr_functions_dropdown IS 'Formatted list of functions for admin dropdown with descriptions';

-- View all functions with their descriptions
SELECT 
  category,
  function_name,
  display_name,
  description
FROM ivr_function_descriptions
WHERE is_active = true
ORDER BY category, display_name;
