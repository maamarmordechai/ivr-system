# Supabase Edge Functions Setup

This directory contains Edge Functions for the calling system using Twilio.

## Prerequisites

1. **Supabase CLI**: Install the Supabase CLI
   ```bash
   npm install -g supabase
   ```

2. **Twilio Account**: Sign up at https://www.twilio.com/try-twilio
   - Get your Account SID
   - Get your Auth Token
   - Get a Twilio phone number

## Setup Instructions

### 1. Link your Supabase project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 2. Set Environment Variables

Set your Twilio credentials as secrets in Supabase:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 3. Deploy the Edge Functions

```bash
# Deploy the make-call function
supabase functions deploy make-call

# Deploy the handle-call-response function
supabase functions deploy handle-call-response
```

### 4. Get the Function URL

After deployment, you'll get URLs like:
- `https://your-project-ref.supabase.co/functions/v1/make-call`
- `https://your-project-ref.supabase.co/functions/v1/handle-call-response`

## Usage

### Making a Call

Send a POST request to the `make-call` function:

```javascript
const { data, error } = await supabase.functions.invoke('make-call', {
  body: {
    to: '+1234567890', // Guest phone number
    guestName: 'John Doe',
    apartmentNumber: '101',
    message: 'Optional custom message'
  }
});
```

## API Reference

### make-call Function

**Endpoint**: `POST /functions/v1/make-call`

**Body Parameters**:
- `to` (required): Phone number to call (E.164 format, e.g., +1234567890)
- `guestName` (optional): Name of the guest
- `apartmentNumber` (optional): Apartment number
- `message` (optional): Custom message to speak

**Response**:
```json
{
  "success": true,
  "callSid": "CA...",
  "status": "queued",
  "message": "Call initiated successfully"
}
```

## Twilio Free Tier Limits

- $15.50 in free credit when you sign up
- Outgoing calls cost approximately $0.013-0.025 per minute
- You can make hundreds of calls with the free credit
- Trial accounts can only call verified phone numbers

## Testing

Test the function locally before deploying:

```bash
supabase functions serve make-call
```

Then make a request:

```bash
curl -X POST http://localhost:54321/functions/v1/make-call \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "guestName": "Test", "apartmentNumber": "101"}'
```

## Troubleshooting

1. **"Twilio credentials not configured"**: Make sure you set the secrets correctly
2. **"The number is unverified"**: In trial mode, verify the number in Twilio console
3. **CORS errors**: The functions include CORS headers, ensure your frontend uses the correct origin

## Security Notes

- Never commit Twilio credentials to version control
- Use Supabase RLS policies to restrict who can call the function
- Consider rate limiting to prevent abuse
- In production, validate the caller's authentication token
