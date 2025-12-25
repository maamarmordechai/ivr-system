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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { week_id } = await req.json();

    if (!week_id) {
      throw new Error('Missing week_id');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active meal hosts who want weekly calls
    const { data: hosts, error: hostsError } = await supabase
      .from('meal_hosts')
      .select(`
        *,
        meal_availabilities!left(status)
      `)
      .eq('is_active', true)
      .eq('wants_weekly_calls', true);

    if (hostsError) throw hostsError;

    if (!hosts || hosts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No active meal hosts found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Filter out hosts who already responded for this week
    const hostsToCall = hosts.filter(host => {
      const availability = host.meal_availabilities?.find((a: any) => a.status === 'confirmed');
      return !availability; // Only call if they haven't confirmed yet
    });

    if (hostsToCall.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All hosts have already responded',
          total: 0,
          successful: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making meal hosting calls to ${hostsToCall.length} hosts for week ${week_id}`);

    const results = [];

    for (const host of hostsToCall) {
      try {
        // Create the callback URL for this specific host and week
        const callbackUrl = `${supabaseUrl}/functions/v1/handle-meal-call?week_id=${week_id}&host_id=${host.id}`;

        // Make the Twilio API call
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

        const twilioData = await response.json();

        if (response.ok) {
          // Log the call initiation
          await supabase.from('meal_calls').insert({
            week_id: week_id,
            host_id: host.id,
            call_sid: twilioData.sid,
            phone_number: host.phone_number,
            status: 'initiated'
          });

          results.push({
            host_id: host.id,
            host_name: host.host_name,
            phone_number: host.phone_number,
            call_sid: twilioData.sid,
            success: true
          });

          console.log(`Call initiated to ${host.host_name} (${host.phone_number}): ${twilioData.sid}`);
        } else {
          results.push({
            host_id: host.id,
            host_name: host.host_name,
            phone_number: host.phone_number,
            success: false,
            error: twilioData.message || 'Unknown error'
          });

          console.error(`Failed to call ${host.host_name}:`, twilioData);
        }

        // Add a small delay between calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error calling host ${host.host_name}:`, error);
        results.push({
          host_id: host.id,
          host_name: host.host_name,
          phone_number: host.phone_number,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Meal hosting calls initiated: ${successCount} successful, ${failureCount} failed`,
        total: hostsToCall.length,
        successful: successCount,
        failed: failureCount,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in make-meal-calls:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
