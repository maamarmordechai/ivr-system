import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { hostPhone, adminPhone, callerId } = await req.json();

    // Use custom caller ID if provided, otherwise use default Twilio number
    const fromNumber = callerId || TWILIO_PHONE_NUMBER;

    console.log(`Initiating live call: Admin ${adminPhone} -> Host ${hostPhone} (From: ${fromNumber})`);

    // Create TwiML that will connect the two parties
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to the host now. Please wait.</Say>
  <Dial callerId="${fromNumber}">
    <Number>${hostPhone}</Number>
  </Dial>
</Response>`;

    // Encode TwiML as URL parameter
    const twimlUrl = `data:application/xml;charset=utf-8,${encodeURIComponent(twiml)}`;

    // Make Twilio API call to initiate outbound call to admin
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: adminPhone,
          From: fromNumber!,
          Url: twimlUrl,
        }),
      }
    );

    const data = await twilioResponse.json();

    if (!twilioResponse.ok) {
      throw new Error(`Twilio API error: ${JSON.stringify(data)}`);
    }

    console.log(`Call initiated successfully: ${data.sid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callSid: data.sid,
        message: "Call initiated" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error initiating call:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
