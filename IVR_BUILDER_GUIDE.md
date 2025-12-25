# IVR Builder - Quick Start Guide

## 🎯 What You Can Do

The IVR Builder lets you customize your entire phone system **without writing code**:

- ✏️ Change what callers hear at each menu
- 🔢 Configure what happens when they press each digit
- 📞 Add voicemail boxes, call transfers, sub-menus
- 🎙️ Choose voice (Alice, Man, Woman)
- ⏱️ Set timeout periods

## 🖥️ Using the IVR Builder Tab

### Left Panel: Your Menus
- Lists all menu levels (Main Menu, Guest Services, etc.)
- Click a menu to edit it
- Click ✏️ to edit menu properties
- Click 🗑️ to delete a menu

### Right Panel: Menu Options
Shows what happens for each digit (0-9, *, #)

#### Each Option Shows:
- **Digit** - What caller presses (big colored circle)
- **Name** - What this option does
- **Action** - Where it leads:
  - → Voicemail: [Box Name]
  - → Sub-menu: [Menu Name]
  - → Transfer to: [Phone Number]
  - → Function: [Custom Function]

## 📝 Common Tasks

### Change Main Menu Greeting

1. Click "Main Menu" in left panel
2. Click "Edit Menu" button (top right)
3. Edit "Prompt Text" field
4. Click "Save Menu"
5. **Done!** Next call will hear new greeting

### Add a New Digit Option

1. Select a menu (click it in left panel)
2. Click "Add Option" button
3. Fill in:
   - **Digit**: Which key (0-9, *, #)
   - **Option Name**: Display name (e.g., "Sales")
   - **Action Type**: What happens
4. Configure based on action type (see below)
5. Click "Save Option"

### Action Types Explained

#### 1. Leave Voicemail
- Caller records a message
- **Configuration**: Select which voicemail box
- **Use for**: Departments that can't answer live

#### 2. Go to Sub-menu
- Routes to another menu with more options
- **Configuration**: Select which sub-menu
- **Use for**: Multi-level navigation (Press 1 → Sub-options)

#### 3. Transfer Call
- Forwards call to a phone number
- **Configuration**: Enter phone number (+1234567890)
- **Use for**: Direct connection to staff mobile

#### 4. Custom Function
- Runs special logic (like host availability check)
- **Configuration**: Select function name
- **Use for**: Database lookups, conditional routing

#### 5. Hang Up
- Ends the call politely
- **Configuration**: None needed
- **Use for**: "Press 0 to exit"

### Create a New Sub-Menu

1. Click "New Menu" button (top right)
2. Fill in:
   - **Menu Name**: Display name (e.g., "Sales Department")
   - **Menu Key**: Unique ID (e.g., "sales") - lowercase, no spaces
   - **Prompt Text**: What callers hear
3. Click "Save Menu"
4. Now go add an option in another menu that points to this new menu!

**Example Flow:**
- Main Menu: Press 5 → Sales Department (submenu)
- Sales Department: Press 1 → New Orders (voicemail), Press 2 → Quotes (voicemail)

## 🎨 Best Practices

### Menu Prompts
✅ **Good**: "Press 1 for billing. Press 2 for technical support. Press 9 to return to the main menu."

❌ **Bad**: "Press 1. Press 2. Press 3." (not descriptive)

### Option Names
Use clear, descriptive names:
- ✅ "Leave Message for Billing"
- ✅ "Transfer to On-Call Manager"
- ❌ "Option 1"
- ❌ "Thing"

### Menu Structure
Keep it shallow:
- ✅ Main → Category → Action (3 levels max)
- ❌ Main → Sub1 → Sub2 → Sub3 → Sub4 (too deep!)

### Timeouts
- **Main Menu**: 10 seconds (people need time to listen)
- **Sub-menus**: 8 seconds (already know system)
- **Quick actions**: 5 seconds (simple yes/no)

## 🔧 Troubleshooting

### "Changes not working when I call"
- Edge Functions may have cached old data
- **Fix**: Redeploy functions (see deployment guide)

### "Option doesn't work"
- Check that action configuration is complete:
  - Voicemail action → Voicemail box selected?
  - Submenu action → Submenu selected?
  - Transfer action → Phone number entered?
- Check option is active (not deleted)

### "Menu doesn't play"
- Check menu is active (is_active = true)
- Check prompt_text is not empty
- Check voice_name is valid (alice/man/woman)

## 💡 Example Setups

### Simple Setup (One Level)
```
Main Menu
├─ Press 1: Leave Message → Voicemail
├─ Press 2: Speak to Staff → Transfer
└─ Press 0: Hang Up
```

### Restaurant Setup
```
Main Menu
├─ Press 1: Reservations → Transfer to host stand
├─ Press 2: Takeout Orders → Transfer to kitchen
├─ Press 3: Catering → Voicemail
└─ Press 0: General Inquiries → Voicemail
```

### Accommodation Setup (Default)
```
Main Menu
├─ Press 1: Guest Services (Sub-menu)
│  ├─ Press 1: Billing → Voicemail
│  ├─ Press 2: Tech Support → Voicemail
│  └─ Press 9: Return to Main
├─ Press 2: Host Registration → Voicemail
├─ Press 3: Urgent / Check Availability → Custom Function
└─ Press 0: Main Office → Voicemail
```

### Support Department Setup
```
Main Menu
├─ Press 1: Technical Issues (Sub-menu)
│  ├─ Press 1: Software → Voicemail (Tech Box 1)
│  ├─ Press 2: Hardware → Voicemail (Tech Box 2)
│  └─ Press 3: Network → Voicemail (Tech Box 3)
├─ Press 2: Billing Questions → Voicemail
├─ Press 3: Sales → Transfer
└─ Press 0: Operator → Transfer
```

## 🎬 Step-by-Step: First Customization

Let's change the main menu greeting:

1. **Open IVR Builder Tab**
   - Click "IVR Builder" in top navigation

2. **Select Main Menu**
   - Left panel → Click "Main Menu" (it's the first one)

3. **Edit the Menu**
   - Top right → Click "Edit Menu" button
   - You'll see a dialog with the current settings

4. **Change the Greeting**
   - Find "Prompt Text (Text-to-Speech)" field
   - Current text: "Welcome to our accommodation service..."
   - Change to your text: "Thank you for calling [Your Business Name]..."
   - Keep the option descriptions (Press 1 for..., Press 2 for...)

5. **Save**
   - Click "Save Menu" button at bottom

6. **Test**
   - Call your Twilio number
   - You should hear your new greeting!

## 🚀 Advanced: Custom Functions

For developers: You can create custom Edge Functions and call them from IVR options.

**Example**: "Press 3 to check host availability"

1. Create Edge Function: `supabase/functions/check-host-availability/index.ts`
2. In IVR Builder:
   - Add Option
   - Digit: 3
   - Action Type: Custom Function
   - Function Name: "check-host-availability"
3. Deploy function: `supabase functions deploy check-host-availability`

The system will auto-redirect: `https://[host]/functions/v1/check-host-availability`

## 📞 Support

If you need help:
1. Check deployment guide (VOICEMAIL_DEPLOYMENT.md)
2. Review database tables (ivr_menus_v2, ivr_menu_options)
3. Check Supabase logs for Edge Function errors
4. Verify voicemail boxes exist (voicemail_boxes table)

Remember: **Every change you make in the IVR Builder takes effect immediately** - no code deployment needed! (Except the first time you set up the system)
