import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const formData = await req.formData();
    const digits = formData.get("Digits")?.toString() || "";
    const from = formData.get("From")?.toString() || "";
    const callSid = formData.get("CallSid")?.toString() || "";
    
    // Get params from URL
    const url = new URL(req.url);
    const weekId = url.searchParams.get('week_id');
    const apartmentId = url.searchParams.get('apartment_id');
    
    console.log(`Bed Count - From: ${from}, Count: ${digits}, Week: ${weekId}`);

    const bedCount = parseInt(digits);

    if (isNaN(bedCount) || bedCount < 1 || bedCount > 9) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Invalid number. Please call back and try again. Goodbye.</Say>
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "application/xml", ...corsHeaders }
      });
    }

    // Get host info
    const { data: apartment } = await supabase
      .from('apartments')
      .select('*')
      .eq('phone_number', from)
      .limit(1)
      .single();

    const hostName = apartment?.person_name || 'host';

    // Record response
    await supabase
      .from('bed_availability_responses')
      .upsert({
        week_id: weekId,
        apartment_id: apartmentId !== 'none' ? apartmentId : apartment?.id,
        phone_number: from,
        host_name: hostName,
        response_type: 'partial',
        beds_offered: bedCount,
        couples_friendly: apartment?.couple_friendly || false,
        call_sid: callSid,
        responded_at: new Date().toISOString()
      }, {
        onConflict: 'week_id,apartment_id'
      });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you ${hostName}! We have recorded ${bedCount} beds available this week.</Say>
  <Pause length="1"/>
  <Say voice="alice">We will contact you if we need to assign guests. Have a wonderful week!</Say>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });

  } catch (error) {
    console.error("Error in bed count:", error);
    
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
