import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contacts, singleCall, bedsNeeded } = await req.json();

    // SINGLE CALL MODE: Only call one person at a time
    // This is the smart mode - call one person, wait for response, then call next if still needed
    if (singleCall && contacts?.length > 0) {
      const contact = contacts[0];
      const { name, phone } = contact;

      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing phone number" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Format phone number
      let formattedPhone = phone.toString().trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
      }

      console.log(`Single call to ${name} at ${formattedPhone}`);

      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      const encodedName = encodeURIComponent(name);
      const twimlUrl = `${SUPABASE_URL}/functions/v1/handle-weekly-availability?step=initial&contact_name=${encodedName}`;

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: TWILIO_PHONE_NUMBER!,
            Url: twimlUrl,
          }),
        }
      );

      const data = await twilioResponse.json();

      if (twilioResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            callSid: data.sid,
            name,
            phone: formattedPhone,
            remainingContacts: contacts.slice(1) // Return remaining contacts for next call
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: data.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // BATCH MODE (legacy): Call multiple people - USE WITH CAUTION
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Contacts array is required" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Batch weekly calls: Processing ${contacts.length} contacts`);

    const results = {
      total: contacts.length,
      success: 0,
      failed: 0,
      details: [] as any[]
    };

    // Twilio auth
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Process each contact
    for (const contact of contacts) {
      try {
        const { name, phone } = contact;

        if (!phone) {
          results.failed++;
          results.details.push({
            name,
            phone,
            status: 'failed',
            error: 'Missing phone number'
          });
          continue;
        }

        // Format phone number (ensure it starts with +)
        let formattedPhone = phone.toString().trim();
        if (!formattedPhone.startsWith('+')) {
          // Assume US number if no country code
          formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
        }

        console.log(`Calling ${name} at ${formattedPhone}`);

        // Create TwiML URL that points to weekly availability check
        // Pass the name as a parameter so it can be used even if not in database
        const encodedName = encodeURIComponent(name);
        const twimlUrl = `${SUPABASE_URL}/functions/v1/handle-weekly-availability?step=initial&contact_name=${encodedName}`;

        // Make Twilio API call
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: formattedPhone,
              From: TWILIO_PHONE_NUMBER!,
              Url: twimlUrl,
            }),
          }
        );

        const data = await twilioResponse.json();

        if (twilioResponse.ok) {
          results.success++;
          results.details.push({
            name,
            phone: formattedPhone,
            status: 'success',
            callSid: data.sid
          });
          console.log(`✓ Call initiated: ${name} - ${data.sid}`);
        } else {
          results.failed++;
          results.details.push({
            name,
            phone: formattedPhone,
            status: 'failed',
            error: data.message || 'Unknown error'
          });
          console.error(`✗ Failed: ${name} - ${data.message}`);
        }

        // Small delay between calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.failed++;
        results.details.push({
          name: contact.name,
          phone: contact.phone,
          status: 'failed',
          error: error.message
        });
        console.error(`Error calling ${contact.name}:`, error);
      }
    }

    console.log(`Batch complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in batch-weekly-calls:", error);
    
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
