# Automated Outbound Calling System - Complete Implementation

## Overview
The system automatically calls apartment hosts to check availability and assigns guests based on their responses.

## System Flow

### 1. Call Initiation
**Edge Function**: `make-call/index.ts`
- System calls hosts based on priority queue
- Welcomes host by name
- States apartment details (beds, family-friendly status)
- Mentions pending guests (couples/individuals)
- Presents 4 options:
  - Press 1: Available this week
  - Press 2: Not available
  - Press 3: Call back Friday
  - Press 4: Partially available

### 2. Host Response Handler
**Edge Function**: `handle-outbound-response/index.ts`
- **Option 1 (Available)**: Routes to beds input
- **Option 2 (Not Available)**: Thanks host, ends call, updates priority
- **Option 3 (Call Friday)**: Schedules callback, sets lower priority
- **Option 4 (Partial)**: Routes to beds input

### 3. Beds Input
**Edge Function**: `handle-beds-input/index.ts`
- Asks: "How many beds available?" (1-9)
- **If family-friendly AND multiple rooms AND 3+ beds**: 
  - Asks: "Can we place couple in one room and individuals in other rooms?"
  - Press 1 (yes): Routes to `handle-mix-response` (allows mixing)
  - Press 2 (no): Assigns couples only (prioritizes couple placement)
- **If family-friendly AND single room OR <3 beds**: Assigns couples only (no mixing)
- **If not family-friendly**: Routes to couple question

### 3.5 Mix Response (New!)
**Edge Function**: `handle-mix-response/index.ts`
- Handles mixing preference for multi-room family apartments
- **If yes (can mix)**: Assigns 1 couple + individuals to fill remaining beds
- **If no (cannot mix)**: Assigns couples only (harder to place, so prioritized)

### 4. Couple Preference
**Edge Function**: `handle-couple-response/index.ts`
- Asks: "Accept couples? Press 1 yes, 2 no"
- Assigns guests with priority logic:
  - **If yes**: Try couple first (2 beds), then fill remaining with individuals
  - **If no**: Assign only individuals (1 bed each)
- Updates apartment priority to 10 (end of queue for next week)

### 5. Guest Assignment Logic
**Priority Rules**:
1. **Family-friendly multi-room apartments**: Ask if couples can mix with individuals
   - **Can mix**: Assign 1 couple (2 beds) + individuals (1 bed each) = fill all beds
   - **Cannot mix**: Assign couples only (prioritize couple placement since harder)
2. **Family-friendly single-room apartments**: Assign couples only (no mixing possible)
3. **Non-family apartments**: Can accept couples if host agrees, mixing allowed
4. **No couples waiting**: Assign individuals to fill available beds
5. **Host accepts this week**: Moved to end of queue (priority 10)
6. **Host declines**: Stays in normal rotation

## Database Schema

### New Tables
```sql
call_history (
  id UUID PRIMARY KEY,
  apartment_id UUID REFERENCES apartments,
  call_sid TEXT,
  call_date TIMESTAMP DEFAULT NOW(),
  response TEXT, -- 'available', 'not_available', 'call_back_friday', 'partially_available'
  beds_offered INTEGER,
  guests_assigned INTEGER
)
```

### Apartment Columns
```sql
apartments (
  ...existing columns...,
  phone_number TEXT NOT NULL, -- Required for calls
  call_frequency TEXT DEFAULT 'weekly', -- 'weekly', 'biweekly', 'desperate'
  last_called_date TIMESTAMP,
  last_accepted_date TIMESTAMP,
  call_priority INTEGER DEFAULT 1, -- Lower = called first
  available_this_week BOOLEAN DEFAULT false
)
```

## Call Frequency Options

### Weekly (Default)
- Host is called every week when guests are waiting
- Best for hosts who regularly want to help

### Biweekly
- Host is called every 2 weeks
- Good for hosts with less availability

### Desperate
- Only called when no weekly/biweekly hosts are available
- For emergency backup hosts

## Priority System

**Call Queue Order**:
1. Apartments with `call_priority = 1` (never called or declined last time)
2. Apartments not called recently (sorted by `last_called_date`)
3. Apartments that accepted last time have `call_priority = 10` (back of queue)

**Why**: This ensures hosts who accept guests get a break next week, while hosts who declined get called again sooner.

## UI Components

### AutomatedCallSystem.jsx
**Location**: Settings → Automated Calls tab

**Features**:
- Shows pending guests count (couples/individuals)
- Displays call queue with priority
- "Call All" button - initiates batch calling
- Individual "Call" buttons for each apartment
- Change call frequency dropdown per apartment

### CreateApartmentDialog.jsx
**Added Fields**:
- Phone number (required)
- Call frequency selector (weekly/biweekly/desperate)
| Function | Purpose | Routes To |
|----------|---------|-----------|
| `make-call` | Initiates call, presents 4 options | `handle-outbound-response` |
| `handle-outbound-response` | Processes 1/2/3/4 choice | `handle-beds-input` or ends |
| `handle-beds-input` | Collects bed count, checks for multi-room | `handle-mix-response`, `handle-couple-response`, or assigns |
| `handle-mix-response` | **NEW**: Asks if couples can mix with individuals | Assigns based on mixing preference |
| `handle-couple-response` | Collects couple preference, assigns guests | Ends with assignment |
| `handle-outbound-response` | Processes 1/2/3/4 choice | `handle-beds-input` or ends |
| `handle-beds-input` | Collects bed count | `handle-couple-response` or assigns |
| `handle-couple-response` | Collects couple preference, assigns guests | Ends with assignment |
## Assignment Logic Examples

**Scenario 1**: Family-friendly apartment, 5 beds, 2 rooms, CAN MIX couples with individuals

1. System asks: "Can we place couple in one room and individuals in other rooms?"
2. Host presses 1 (yes, can mix)
3. System finds 1 couple waiting → Assign couple (2 beds used, Room 1)
4. Remaining: 3 beds
5. System finds 3 individuals → Assign all (3 beds used, Room 2)
6. **Total: 5 beds used, 4 guests assigned (1 couple in Room 1 + 3 individuals in Room 2)**
7. Host moved to priority 10 for next week

**Scenario 2**: Family-friendly apartment, 5 beds, 2 rooms, CANNOT MIX

1. System asks: "Can we place couple in one room and individuals in other rooms?"
2. Host presses 2 (no, cannot mix)
3. **System prioritizes couples** (harder to place)
4. System finds 2 couples waiting → Assign both couples (4 beds used)
5. Remaining: 1 bed (not enough for another couple)
6. **Total: 4 beds used, 4 guests assigned (2 couples only)**
7. **No individuals assigned** (mixing not allowed)
8. Host moved to priority 10 for next week

**Scenario 3**: Family-friendly apartment, 3 beds, 1 room (automatic no-mix)

1. System doesn't ask mixing question (single room)
2. System finds 1 couple → Assign couple (2 beds used)
3. Remaining: 1 bed
4. System looks for another couple → None fits
5. **Total: 2 beds used, 2 guests (1 couple only)**
6. **No individuals assigned** (couples prioritized in single-room family apartments)

**Scenario 4**: Not family-friendly, 3 beds, host accepts couples

1. System asks: "Accept couples? Press 1 yes, 2 no"
2. Host presses 1 (yes)
3. System finds 1 couple → Assign couple (2 beds, mixing allowed)
4. Remaining: 1 bed
5. System finds 1 individual → Assign (1 bed used)
6. **Total: 3 beds used, 3 guests (1 couple + 1 individual, mixing OK for non-family)**
4. Host moved to priority 10 for next week
## Next Steps

1. Deploy all **5** Edge Functions to Supabase (added `handle-mix-response`)
2. Run database migration
3. Add Twilio credentials as environment variables
4. Test call flow end-to-end (especially multi-room mixing logic)
5. Add email notifications for guest assignments
6. Schedule automatic weekly calling (e.g., Monday mornings)

## Key Implementation Notes

**Critical Logic**: 
- **Multi-room family apartments**: Always ask about mixing to respect privacy concerns
- **Single-room or small apartments**: No mixing question, couples only (harder to place)
- **Non-family apartments**: Mixing allowed by default if host accepts couples
- **Prioritization**: When mixing not allowed, fill with couples first (harder to place than individuals)
6. Answer phone and test all 4 options
7. Verify assignments in database

## Key Features

✅ Personalized greetings with host name
✅ Smart guest matching (couples vs individuals)
✅ Priority queue system
✅ Call frequency preferences
✅ Automatic assignment after acceptance
✅ Hosts who accept get break next week
✅ Tracks all call history
✅ Batch calling capability
✅ Real-time pending guest counts
✅ Configurable via UI

## Next Steps

1. Deploy all 4 Edge Functions to Supabase
2. Run database migration
3. Add Twilio credentials as environment variables
4. Test call flow end-to-end
5. Add email notifications for guest assignments
6. Schedule automatic weekly calling (e.g., Monday mornings)
