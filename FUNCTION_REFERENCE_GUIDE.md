# IVR Function Reference Guide

## Complete List of Functions

### 📝 Registration Functions

#### `register_host` - Register as Host
**What it does:** Complete registration workflow for new accommodation hosts.

**Call Flow:**
1. Asks: "How many beds can you provide?" (1-20)
2. Records host's name (10 seconds max)
3. Asks: "How often should we call you?"
   - Press 1: Every week
   - Press 2: Every second week
   - Press 3: Once a month
   - Press 4: Only busy weeks
4. Asks: "Does your accommodation have a private entrance?" (Yes/No)
5. Confirms registration complete

**Database Actions:**
- Creates/updates apartment record
- Stores: phone_number, person_name, number_of_beds, call_frequency, special_instructions
- Sets last_called_date to track calling schedule

**Use When:** Someone wants to register to host overnight guests.

---

#### `register_meal_host` - Register for Meal Hosting
**What it does:** Simplified registration for people who only want to host meals (not overnight guests).

**Call Flow:**
1. Explains meal hosting program
2. Asks: "Press 1 to register, 2 to cancel"
3. If confirmed, creates meal host record
4. Stores phone number and preferences

**Database Actions:**
- Creates apartment record with meal_only flag
- Sets up for meal availability calls only

**Use When:** Someone can provide Shabbat meals but cannot host overnight.

---

#### `guest_registration` - Guest Registration
**What it does:** Registers guests who need accommodation.

**Call Flow:**
1. Collects guest information
2. Records accommodation needs
3. Adds to guest database

**Database Actions:**
- Creates guest record
- Stores requirements and preferences

**Use When:** Guest calls to request accommodation.

---

### 🏠 Host Management Functions

#### `beds` - Manage Guest Beds
**What it does:** Updates bed availability for the current week.

**Call Flow:**
1. "How many beds do you have available this week?"
2. Accepts number input
3. Updates database
4. Confirms receipt

**Database Actions:**
- Updates bed_confirmations table for current week
- Tracks available_beds count
- Records timestamp

**Use When:** 
- Weekly availability check calls (automated)
- Host calls to update availability
- Pressing digit 3 from main menu

---

#### `meals` - Manage Shabbat Meals  
**What it does:** Updates meal hosting availability.

**Call Flow:**
1. Asks about Friday night dinner availability
2. Asks about Shabbat lunch availability
3. Records responses
4. Updates database

**Database Actions:**
- Updates meal_confirmations table
- Stores meal type availability
- Links to current week

**Use When:**
- Meal availability check calls
- Host calls to update meal availability
- Pressing digit 4 from main menu

---

### 🔧 Administrative Functions

#### `trigger_busy_campaign` - Trigger Busy Shabbos Campaign
**What it does:** **ADMIN ONLY** - Initiates emergency calling campaign for busy weeks.

**Call Flow:**
1. Confirms admin wants to trigger campaign
2. "Press 1 to confirm, 2 to cancel"
3. If confirmed:
   - Marks current week as "desperate"
   - Calculates all hosts to call
   - Reports number of hosts
4. Initiates automated calls

**Database Actions:**
- Creates/updates desperate_weeks entry
- Sets is_desperate = true
- Records triggered_by (caller phone)
- Sets triggered_at timestamp

**Who Gets Called:**
- Weekly hosts: ✓ Called
- Bi-weekly hosts: ✓ Called (even if not their week)
- Monthly hosts: ✓ Called (even if not their month)
- Desperate-only hosts: ✓ Called (this is why they registered!)
- Never hosts: ✗ Not called

**Use When:** 
- High demand for Shabbat (many guests)
- Regular hosts are full
- Need backup/emergency hosts
- Special events requiring extra capacity

**Safety:** Requires confirmation to prevent accidental triggers.

---

#### `admin` - Administrative Functions
**What it does:** Access to system administration and management tools.

**Call Flow:**
- Varies based on admin submenu

**Use When:** Admin needs to manage system settings.

---

### 🔍 Internal Functions

#### `check_host_availability` - Check Host Availability
**What it does:** Internal function to verify if host has beds available.

**Used By:** System automation, not directly callable by users.

**Database Actions:**
- Queries bed_confirmations
- Returns availability status

---

## Function Name Mapping

For IVR menu configuration, use these exact function names:

| Display Name | Function Name Code | IVR Menu Digit |
|--------------|-------------------|----------------|
| Register as Host | `register_host` | 2 |
| Manage Guest Beds | `beds` | 3 |
| Manage Shabbat Meals | `meals` | 4 |
| Register for Meal Hosting | `register_meal_host` | 5 |
| Trigger Busy Campaign | `trigger_busy_campaign` | 6 |
| Administrative Functions | `admin` | 8 |
| Guest Services | `beds` | 1 |
| Main Office | (voicemail) | 0 |

## Call Frequency Options

When hosts register (`register_host`), they choose:

### 1. Weekly (Press 1)
- Called every week
- Best for: Active hosts with consistent availability
- Calls per year: ~52

### 2. Bi-Weekly / Every Second Week (Press 2)
- Called every 2 weeks
- Best for: Hosts who prefer less frequent contact
- Calls per year: ~26 + busy weeks

### 3. Monthly / Once a Month (Press 3)
- Called every 4 weeks
- Best for: Occasional hosts
- Calls per year: ~13 + busy weeks

### 4. Desperate-Only / Busy Weeks Only (Press 4)
- ONLY called during busy Shabbos
- Best for: Backup/emergency hosts
- Calls per year: 0-10 (only when triggered)

**Important:** During busy weeks (triggered via `trigger_busy_campaign`), ALL hosts get called regardless of their frequency setting.

## Database Functions Reference

### `should_call_apartment(apt_id, target_week_date)`
Returns TRUE/FALSE if apartment should be called this week.

**Logic:**
```
IF busy_week THEN
  RETURN true (call everyone except 'never')
ELSIF frequency = 'desperate-only' THEN
  RETURN false (only call on busy weeks)
ELSIF frequency = 'weekly' THEN
  RETURN weeks_since_last_call >= 1
ELSIF frequency = 'bi-weekly' THEN
  RETURN weeks_since_last_call >= 2
ELSIF frequency = 'monthly' THEN
  RETURN weeks_since_last_call >= 4
END
```

### `get_apartments_to_call(target_week_date)`
Returns list of all apartments to call for specified week.

**Returns:** apartment_id, person_name, phone_number, number_of_beds, call_frequency, reason

### `trigger_busy_shabbos_campaign(target_week_date, admin_user)`
Admin function to trigger emergency campaign.

**Returns:** week_id, apartments_count, message

## Adding New Functions

To add a new function to the system:

1. **Create the Edge Function**
   - Add to `supabase/functions/[function-name]/index.ts`
   - Follow TwiML response pattern

2. **Add Description**
   ```sql
   INSERT INTO ivr_function_descriptions (function_name, display_name, description, category)
   VALUES ('new_function', 'New Function', 'Description here', 'Category');
   ```

3. **Add to IVR Menu** (if needed)
   ```sql
   INSERT INTO ivr_menu_options (menu_id, digit, option_name, action_type, function_name, sort_order)
   VALUES (menu_id, '7', 'New Function', 'custom_function', 'new_function', 7);
   ```

4. **Update handle-ivr-selection**
   - Add routing logic for new function_name

5. **Test the flow**
   - Call system, press digit
   - Verify TwiML responses
   - Check database updates

## Categories

Functions are organized into categories for the admin interface:

- **Registration**: New user sign-ups
- **Host Management**: Availability updates
- **Admin**: System administration
- **Internal**: System-use only

## Quick Reference Chart

```
┌─────────────────────────────────────────────────────────────┐
│                    IVR FUNCTION FLOWCHART                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Digit 1: Guest Services → beds function                     │
│  Digit 2: Register Host → register_host (4 frequency opts)   │
│  Digit 3: Update Beds → beds function                        │
│  Digit 4: Update Meals → meals function                      │
│  Digit 5: Meal Host → register_meal_host                     │
│  Digit 6: Busy Trigger → trigger_busy_campaign (admin)       │
│  Digit 8: Admin → admin functions                            │
│  Digit 0: Voicemail → Main office                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
