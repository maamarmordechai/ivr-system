# Audio Prompt System with Split Files

## Overview
This system allows dynamic data (bed counts, guest counts, etc.) to be inserted between separate MP3 files.

## How It Works

### 1. Sequence Order
Each audio prompt has a `sequence_order` number (0-999):
- **0-9**: Welcome and initial prompts
- **10-19**: Update detection prompts (when user already confirmed)
- **20-29**: Update flow prompts
- **30-49**: Success/thank you messages
- **50-99**: Error and fallback messages
- **100+**: System errors

### 2. Flow Context
Each prompt specifies when it should be used:
- **`new`**: Only for new confirmations (first time calling)
- **`update`**: Only when updating existing confirmation
- **`both`**: Always played regardless of flow

### 3. Split Prompts (Before/After Pattern)

When system needs to insert dynamic data (bed count, guest count), use split prompts:

#### Example: "You already confirmed 5 beds this week"
```
1. Play: already_confirmed_before.mp3 → "You already confirmed"
2. Say with TTS: "5 beds" (or use prerecorded number files)
3. Play: already_confirmed_after.mp3 → "this week"
```

## Bed System Audio Keys

### New Confirmation Flow (flow_context='new' or 'both')
| Seq | Key | Text | Contains Dynamic Data |
|-----|-----|------|----------------------|
| 0 | welcome_to_hosting | "Welcome to the hosting system" | No |
| 1 | we_are_looking_for_beds | "We are looking for beds this week" | No |
| 2 | how_many_beds_can_you_provide | "How many beds can you provide? Enter a number now" | No |
| 30 | thank_you_for_beds | "Thank you for offering [X] beds this week" | Yes - bed count |
| 31 | record_your_name | "Please record your name after the beep" | No |

### Update Flow (flow_context='update')
| Seq | Key | Text | Contains Dynamic Data |
|-----|-----|------|----------------------|
| 10 | already_confirmed_before | "You already confirmed" | No |
| 11 | (system speaks count) | "5 beds" | **DYNAMIC DATA** |
| 12 | already_confirmed_after | "this week" | No |
| 13 | update_press1_keep0 | "Press 1 to update, 0 to keep" | No |
| 20 | previously_confirmed_before | "You previously confirmed" | No |
| 21 | (system speaks count) | "3 beds" | **DYNAMIC DATA** |
| 22 | previously_confirmed_after | "beds" | No |
| 23 | enter_new_bed_count | "Please enter the new number" | No |
| 40 | beds_updated_from_to | "Updated from X to Y beds" | Yes - old and new count |
| 41 | beds_cancelled | "Your confirmation has been cancelled" | No |

### Errors (flow_context='both')
| Seq | Key | Text |
|-----|-----|------|
| 50 | no_response_goodbye | "We didn't receive your response. Goodbye" |
| 100 | error_try_again | "There was an error. Please try again" |

## Meal System Audio Keys

### New Confirmation Flow (flow_context='new' or 'both')
| Seq | Key | Text | Contains Dynamic Data |
|-----|-----|------|----------------------|
| 0 | welcome_meal_system | "Welcome to the meal hosting system" | No |
| 1 | looking_for_meal_hosts | "We are looking for meal hosts" | No |
| 2 | meal_hosting_questions | "Will you be hosting Friday night? Saturday day?" | No |
| 30 | thank_you_meals | "Thank you for offering to host meals" | No |

### Update Flow (flow_context='update')
| Seq | Key | Text | Contains Dynamic Data |
|-----|-----|------|----------------------|
| 10 | already_confirmed_guests_before | "You already confirmed" | No |
| 11 | (system speaks description) | "3 guests for both meals" | **DYNAMIC DATA** |
| 12 | already_confirmed_guests_after | "for meals this week" | No |
| 13 | meal_update_press1_keep0 | "Press 1 to update, 0 to keep" | No |

## Edge Function Implementation Pattern

### Example: open-call-system/index.ts (Bed System)

```typescript
// Check for existing confirmation
const existingConfirmation = await checkExistingConfirmation(apartmentId);

if (existingConfirmation) {
  // UPDATE FLOW - Load only 'update' and 'both' context prompts
  const updateAudio = await supabase
    .from('bed_audio_settings')
    .select('*')
    .in('flow_context', ['update', 'both'])
    .order('sequence_order', { ascending: true });

  let twiml = '<Response><Gather numDigits="1" ...>';
  
  // Sequence 10: "You already confirmed"
  twiml += getAudioOrSay('already_confirmed_before');
  
  // Sequence 11: Dynamic data - bed count
  twiml += `<Say voice="man" language="en-US">${existingConfirmation.beds_confirmed} beds</Say>`;
  
  // Sequence 12: "this week"
  twiml += getAudioOrSay('already_confirmed_after');
  
  // Sequence 13: "Press 1 to update..."
  twiml += getAudioOrSay('update_press1_keep0');
  
  twiml += '</Gather></Response>';

} else {
  // NEW FLOW - Load only 'new' and 'both' context prompts
  const newAudio = await supabase
    .from('bed_audio_settings')
    .select('*')
    .in('flow_context', ['new', 'both'])
    .order('sequence_order', { ascending: true });

  let twiml = '<Response><Gather numDigits="2" ...>';
  
  // Sequence 0: "Welcome to the hosting system"
  twiml += getAudioOrSay('welcome_to_hosting');
  
  // Sequence 1: "We are looking for beds"
  twiml += getAudioOrSay('we_are_looking_for_beds');
  
  // Sequence 2: "How many beds..."
  twiml += getAudioOrSay('how_many_beds_can_you_provide');
  
  twiml += '</Gather></Response>';
}
```

### Helper Function Example

```typescript
function getAudioOrSay(audioKey: string, audioSettings: any[]): string {
  const audio = audioSettings.find(a => a.audio_key === audioKey);
  
  if (audio?.mp3_url) {
    // Use uploaded MP3 file
    return `<Play>${audio.mp3_url}</Play>`;
  } else {
    // Fallback to text-to-speech
    return `<Say voice="man" language="en-US">${audio?.audio_text || ''}</Say>`;
  }
}
```

## Recording Audio Files

When recording Hebrew audio, create separate MP3 files for each key:

### Before/After Pairs
- `already_confirmed_before.mp3` - "כבר אישרת"
- `already_confirmed_after.mp3` - "מיטות השבוע"

Then the system plays:
1. `already_confirmed_before.mp3`
2. TTS: "5" (in English or recorded number)
3. `already_confirmed_after.mp3`

Result: "כבר אישרת 5 מיטות השבוע"

## Database Query to Set MP3 URLs

After recording and uploading MP3 files:

```sql
-- Update bed audio with MP3 URLs
UPDATE bed_audio_settings 
SET mp3_url = 'https://your-storage.com/audio/already_confirmed_before.mp3'
WHERE audio_key = 'already_confirmed_before';

-- Or bulk update from JSON
UPDATE bed_audio_settings 
SET mp3_url = data.url
FROM (VALUES 
  ('welcome_to_hosting', 'https://...'),
  ('already_confirmed_before', 'https://...'),
  ('already_confirmed_after', 'https://...')
) AS data(key, url)
WHERE audio_key = data.key;
```

## Benefits of This System

1. **Flexibility**: Easy to switch between Hebrew MP3s and English TTS
2. **Dynamic Data**: Insert real-time bed/guest counts between fixed audio
3. **Flow Control**: Different prompts for new vs. update scenarios
4. **Sequence Control**: Easy to reorder prompts by changing sequence_order
5. **No Code Changes**: Update audio by uploading new MP3s to database
6. **Fallback**: If MP3 is missing, system uses TTS from audio_text column
