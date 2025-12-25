# Deploy New Functions

## Method 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions
2. Click "Deploy a new function"
3. For each function:

### register-host
- Name: `register-host`
- Copy code from: `supabase\functions\register-host\index.ts`
- Paste into editor
- Click Deploy

### register-meal-host
- Name: `register-meal-host`
- Copy code from: `supabase\functions\register-meal-host\index.ts`
- Paste into editor
- Click Deploy

### handle-ivr-selection (UPDATE)
- Name: `handle-ivr-selection`
- Copy code from: `supabase\functions\handle-ivr-selection\index.ts`
- Paste into editor (replacing existing)
- Click Deploy

## Method 2: VS Code Extension

1. Install "Supabase" extension in VS Code
2. Connect to project
3. Right-click function folder → Deploy

## After Deployment

Run SQL in Supabase SQL Editor:

```sql
-- Update IVR option 2 for host registration
UPDATE ivr_menu_options
SET 
  action_type = 'custom_function',
  function_name = 'register_host'
WHERE digit = '2'
AND menu_id IN (SELECT id FROM ivr_menus_v2 WHERE is_root = true);

-- Add new IVR option for meal host registration
-- First, find your root menu ID
SELECT id, menu_name FROM ivr_menus_v2 WHERE is_root = true;

-- Then insert new option (replace MENU_ID_HERE with actual ID)
INSERT INTO ivr_menu_options (
  menu_id,
  digit,
  option_name,
  action_type,
  function_name,
  sort_order,
  is_active
) VALUES (
  'MENU_ID_HERE',
  '5',
  'If you would like to register to host guests for meals, please press number five.',
  'custom_function',
  'register_meal_host',
  50,
  true
) ON CONFLICT DO NOTHING;
```

## Test the Functions

Call your Twilio number:
- Press 2 → Should start host registration flow
- Press 5 → Should start meal host registration flow
