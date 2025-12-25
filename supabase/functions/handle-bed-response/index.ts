import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== handle-bed-response invoked ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get URL parameters
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");

    console.log(`URL Params - from: ${fromParam}`);

    let digits = "";
    let from = fromParam || "";
    let callSid = "";

    // For POST requests (digit pressed), parse form data
    if (req.method === "POST") {
      try {
        const formData = await req.formData();
        digits = formData.get("Digits")?.toString() || "";
        from = formData.get("From")?.toString() || from;
        callSid = formData.get("CallSid")?.toString() || "";
      } catch (e) {
        console.error("Error parsing form data:", e);
      }
    }
    
    console.log(`Bed Response - From: ${from}, Digits: ${digits}, CallSid: ${callSid}`);

    // Get week and apartment info from database
    const [weekIdResult, apartmentResult] = await Promise.all([
      supabase.rpc('get_current_week'),
      supabase
        .from('apartments')
        .select('*')
        .eq('phone_number', from)
        .limit(1)
        .single()
    ]);

    const weekId = weekIdResult.data;
    const apartment = apartmentResult.data;
    const apartmentId = apartment?.id || "";
    const hostName = apartment?.person_name || 'host';

    const projectUrl = supabaseUrl.replace('https://', '');
    let twiml = '';

    // If no digits (shouldn't happen with proper flow), return error
    if (!digits) {
      console.error("No digits received");
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We didn't receive your selection. Please try again. Goodbye.</Say>
</Response>`;
      
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "application/xml", ...corsHeaders }
      });
    }

    switch (digits) {
      case "1": // Yes - has beds
        // Record response
        await supabase
          .from('bed_availability_responses')
          .upsert({
            week_id: weekId,
            apartment_id: apartmentId,
            phone_number: from,
            host_name: hostName,
            response_type: 'yes',
            beds_offered: apartment?.number_of_beds || 2,
            couples_friendly: apartment?.couple_friendly || false,
            call_sid: callSid,
            responded_at: new Date().toISOString()
          }, {
            onConflict: 'week_id,apartment_id'
          });

        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you ${hostName}! We have recorded that you have ${apartment?.number_of_beds || 2} beds available this week.</Say>
  <Pause length="1"/>
  <Say voice="alice">We will contact you if we need to assign guests. Have a wonderful week!</Say>
</Response>`;
        break;

      case "2": // No - no beds
        await supabase
          .from('bed_availability_responses')
          .upsert({
            week_id: weekId,
            apartment_id: apartmentId,
            phone_number: from,
            host_name: hostName,
            response_type: 'no',
            beds_offered: 0,
            call_sid: callSid,
            responded_at: new Date().toISOString()
          }, {
            onConflict: 'week_id,apartment_id'
          });

        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you ${hostName} for letting us know. Have a wonderful week!</Say>
</Response>`;
        break;

      case "3": // Partial - ask for number
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="https://${projectUrl}/functions/v1/handle-bed-count?week_id=${weekId}&apartment_id=${apartmentId}" method="POST" timeout="10">
    <Say voice="alice">Please enter the number of beds you have available, from 1 to 9, then press pound.</Say>
  </Gather>
  <Say voice="alice">We didn't receive your response. We'll call you back on Friday. Goodbye.</Say>
</Response>`;
        break;

      case "9": // Call back Friday
        // Calculate next Friday
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + daysUntilFriday);
        nextFriday.setHours(10, 0, 0, 0); // 10 AM

        await supabase
          .from('callback_queue')
          .insert({
            week_id: weekId,
            apartment_id: apartmentId,
            phone_number: from,
            host_name: hostName,
            callback_reason: 'requested',
            scheduled_for: nextFriday.toISOString()
          });

        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">No problem ${hostName}. We will call you back on Friday morning. Have a great week!</Say>
</Response>`;
        break;

      default:
        // Invalid selection - add to callback queue
        const invalidDate = new Date();
        invalidDate.setDate(invalidDate.getDate() + 7);
        
        await supabase
          .from('callback_queue')
          .insert({
            week_id: weekId,
            apartment_id: apartmentId,
            phone_number: from,
            host_name: hostName,
            callback_reason: 'no_answer',
            scheduled_for: invalidDate.toISOString()
          });

        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We didn't understand your selection. We'll call you back on Friday. Goodbye.</Say>
</Response>`;
    }

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });

  } catch (error) {
    console.error("Error in bed response:", error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">An error occurred. Please try again later. Goodbye.</Say>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });
  }
});
