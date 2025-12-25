import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle both POST with form data (from Twilio) and JSON (from frontend)
    let digits, weekId, type;
    
    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // From frontend
      const body = await req.json();
      weekId = body.week_id;
      type = body.call_type;
      digits = '1'; // Auto-confirm from frontend
    } else {
      // From Twilio
      const formData = await req.formData();
      digits = formData.get('Digits') as string;
      const url = new URL(req.url);
      weekId = url.searchParams.get('week_id');
      type = url.searchParams.get('type'); // 'beds' or 'meals'
    }

    if (digits !== '1') {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
        <Say voice="man" language="he-IL">Calls not sent. Goodbye.</Say>
      </Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml', ...corsHeaders } });
    }

    console.log('Sending automated calls:', { weekId, type });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'beds') {
      // First check if we still need beds
      const { data: tracking } = await supabase
        .from('weekly_bed_tracking')
        .select('*')
        .eq('week_id', weekId)
        .maybeSingle();

      if (tracking) {
        const bedsNeeded = tracking.beds_needed || 30;
        const bedsConfirmed = tracking.beds_confirmed || 0;
        
        if (bedsConfirmed >= bedsNeeded) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `No calls needed - already have ${bedsConfirmed}/${bedsNeeded} beds confirmed`,
              calls_made: 0 
            }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      }

      // Get apartments that want weekly calls, ordered by priority (longest time not helping first)
      const { data: apartments } = await supabase
        .from('apartments')
        .select('*')
        .eq('wants_weekly_calls', true)
        .order('last_helped_date', { ascending: true, nullsFirst: true })
        .order('times_helped', { ascending: true });

      if (!apartments || apartments.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No hosts configured for weekly calls',
            calls_made: 0 
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Filter out hosts who already confirmed for this week
      const { data: existingConfirmations } = await supabase
        .from('bed_confirmations')
        .select('apartment_id')
        .eq('week_id', weekId)
        .eq('voided', false);

      const confirmedApartmentIds = new Set(existingConfirmations?.map(c => c.apartment_id) || []);
      
      const apartmentsToCall = apartments.filter(apt => !confirmedApartmentIds.has(apt.id));

      if (apartmentsToCall.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'All hosts have already responded',
            calls_made: 0 
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Make calls
      let callsMade = 0;
      for (const apartment of apartmentsToCall) {
        try {
          const callbackUrl = `${supabaseUrl}/functions/v1/open-call-system?week_id=${weekId}&apartment_id=${apartment.id}`;
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
          const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: apartment.phone_number,
              From: twilioPhoneNumber,
              Url: callbackUrl,
              Method: 'POST',
            }),
          });

          if (response.ok) {
            callsMade++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between calls
          }
        } catch (error) {
          console.error(`Error calling ${apartment.phone_number}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${callsMade} calls have been initiated`,
          calls_made: callsMade 
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

    } else if (type === 'meals') {
      // Get meal hosts that want weekly calls
      const { data: hosts } = await supabase
        .from('meal_hosts')
        .select('*')
        .eq('is_active', true);

      if (!hosts || hosts.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No meal hosts configured',
            calls_made: 0 
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      let callsMade = 0;
      for (const host of hosts) {
        try {
          const callbackUrl = `${supabaseUrl}/functions/v1/handle-meal-call?week_id=${weekId}&host_id=${host.id}`;
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
          const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: host.phone_number,
              From: twilioPhoneNumber,
              Url: callbackUrl,
              Method: 'POST',
            }),
          });

          if (response.ok) {
            callsMade++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error calling ${host.phone_number}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${callsMade} meal calls have been initiated`,
          calls_made: callsMade 
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

  } catch (error) {
    console.error('Error in handle-admin-send-calls:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
