import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const from = formData.get("From") || formData.get("Caller");
    const digits = formData.get("Digits");

    console.log("Trigger Busy Campaign - From:", from, "Digits:", digits);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple confirmation flow
    if (!digits) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="${supabaseUrl}/functions/v1/trigger-busy-campaign" method="POST" timeout="15">
        <Say voice="man" language="en-US">You are about to trigger a busy Shabbos campaign. This will call all hosts including those marked for busy weeks only. Press 1 to confirm, or 2 to cancel.</Say>
    </Gather>
    <Say voice="man" language="en-US">No response received. Goodbye.</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    if (digits === "1") {
      // Trigger the campaign
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (5 - targetDate.getDay() + 7) % 7); // Next Friday
      
      const { data, error } = await supabase.rpc('trigger_busy_shabbos_campaign', {
        target_week_date: targetDate.toISOString().split('T')[0],
        admin_user: from
      });

      console.log("Campaign triggered:", data, "Error:", error);

      const apartmentCount = data?.[0]?.apartments_count || 0;

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Campaign triggered successfully. ${apartmentCount} hosts will be called. Goodbye.</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    } else {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Campaign cancelled. Goodbye.</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

  } catch (error) {
    console.error("Error in trigger-busy-campaign:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Sorry, an error occurred. Please try again later.</Say>
</Response>`;

    return new Response(errorTwiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
      status: 200,
    });
  }
});
