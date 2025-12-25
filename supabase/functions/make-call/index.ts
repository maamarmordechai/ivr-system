import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")?.trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("make-call function invoked");
    console.log("Available env vars:", Object.keys(Deno.env.toObject()).filter(k => k.includes('TWILIO')));
    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    const { apartmentId } = requestBody;

    if (!apartmentId) {
      console.log("ERROR: No apartmentId provided");
      return new Response(
        JSON.stringify({ error: "Apartment ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }}
      );
    }

    console.log("Processing apartment:", apartmentId);

    // Validate Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.log("ERROR: Twilio credentials missing", {
        hasSid: !!TWILIO_ACCOUNT_SID,
        hasToken: !!TWILIO_AUTH_TOKEN,
        hasPhone: !!TWILIO_PHONE_NUMBER
      });
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }}
      );
    }

    console.log("Twilio credentials validated");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Get apartment details
    const { data: apartment, error: aptError } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (aptError || !apartment) {
      return new Response(
        JSON.stringify({ error: "Apartment not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders }}
      );
    }

    if (!apartment.phone_number) {
      return new Response(
        JSON.stringify({ error: "Apartment has no phone number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }}
      );
    }

    // Get call settings
    const { data: settings } = await supabase
      .from('call_settings')
      .select('*')
      .single();

    const voice = settings?.voice_gender || 'man';

    // Count pending guests (unassigned)
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const { data: allGuests } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        is_couple,
        number_of_people,
        check_in_date,
        check_out_date,
        assignments!left (id)
      `)
      .lte('check_in_date', oneWeekFromNow.toISOString())
      .gte('check_out_date', new Date().toISOString());

    const pendingGuests = allGuests?.filter(g => !g.assignments || g.assignments.length === 0) || [];
    const pendingCouples = pendingGuests.filter(g => g.is_couple === true);
    const pendingIndividuals = pendingGuests.filter(g => g.is_couple !== true);

    // Determine what to mention
    let guestInfo = '';
    if (apartment.is_family_friendly === true) {
      if (pendingCouples.length > 0) {
        guestInfo = `We have ${pendingCouples.length} couple${pendingCouples.length > 1 ? 's' : ''} waiting`;
        if (pendingIndividuals.length > 0) {
          guestInfo += ` and ${pendingIndividuals.length} individual${pendingIndividuals.length > 1 ? 's' : ''}`;
        }
      } else if (pendingIndividuals.length > 0) {
        guestInfo = `We have ${pendingIndividuals.length} individual guest${pendingIndividuals.length > 1 ? 's' : ''} waiting`;
      }
    } else {
      // Not family friendly - only mention individuals
      if (pendingIndividuals.length > 0) {
        guestInfo = `We have ${pendingIndividuals.length} guest${pendingIndividuals.length > 1 ? 's' : ''} waiting`;
      }
    }

    // Build the TwiML message
    const welcomeMessage = settings?.welcome_message || 
      `Hello ${apartment.person_name}. This is a call from Accommodation Management.`;
    
    const bedsInfo = `Based on our records, you have ${apartment.number_of_beds} bed${apartment.number_of_beds > 1 ? 's' : ''} available.`;
    
    const familyInfo = apartment.is_family_friendly === true ? 
      ' You accept families and couples.' : ' You accept individual guests.';

    const menuOptions = `If you are available this week to take guests, press 1. If you are not available, press 2. If you wish us to call you back Friday, press 3. If you have only part of this space available this week, press 4.`;

    // Build welcome section (audio or TTS)
    let welcomeSection = '';
    if (settings?.use_welcome_audio && settings?.welcome_audio_url) {
      welcomeSection = `<Play>${settings.welcome_audio_url}</Play>`;
    } else {
      welcomeSection = `<Say voice="${voice}">${welcomeMessage}</Say>
  <Pause length="1"/>
  <Say voice="${voice}">${bedsInfo}${familyInfo}</Say>`;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${welcomeSection}
  <Pause length="1"/>
  ${guestInfo ? `<Say voice="${voice}">${guestInfo}.</Say><Pause length="1"/>` : ''}
  <Gather numDigits="1" action="https://${SUPABASE_URL.replace('https://', '')}/functions/v1/handle-outbound-response?apartmentId=${apartmentId}" method="POST" timeout="10">
    <Say voice="${voice}">${menuOptions}</Say>
  </Gather>
  <Say voice="${voice}">We didn't receive your input. We'll try calling again later. Goodbye.</Say>
</Response>`;

    // Make call via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", apartment.phone_number);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Twiml", twiml);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({ error: "Failed to make call", details: twilioData }),
        { status: twilioResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders }}
      );
    }

    // Record call in history
    await supabase.from('call_history').insert({
      apartment_id: apartmentId,
      call_sid: twilioData.sid,
      response: 'no_response'
    });

    // Update last_called_date
    await supabase.from('apartments').update({
      last_called_date: new Date().toISOString()
    }).eq('id', apartmentId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callSid: twilioData.sid,
        status: twilioData.status,
        message: "Automated call initiated successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }}
    );

  } catch (error) {
    console.error("Error in make-call:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }}
    );
  }
});
