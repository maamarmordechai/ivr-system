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

    console.log("Register Meal Host - From:", from, "Digits:", digits);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const phoneNumber = String(from).replace(/\D/g, "");

    // Initial flow - ask for confirmation
    if (!digits) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Welcome to meal host registration.</Say>
    <Gather numDigits="1" action="${supabaseUrl}/functions/v1/register-meal-host?from=${encodeURIComponent(from)}" method="POST" timeout="15">
        <Say voice="man" language="en-US">Would you like to receive calls every week asking if you can host guests for Shabbos meals?</Say>
        <Say voice="man" language="en-US">Press 1 to register for weekly meal calls.</Say>
        <Say voice="man" language="en-US">Press 2 to cancel.</Say>
    </Gather>
    <Say voice="man" language="en-US">We didn't receive your response. Goodbye.</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Process response
    if (digits === "1") {
      // Check if apartment exists
      const { data: existingApt } = await supabase
        .from("apartments")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (existingApt) {
        // Update existing apartment
        await supabase
          .from("apartments")
          .update({ 
            call_frequency: "weekly",
            preferences: "Available for meals"
          })
          .eq("id", existingApt.id);

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Thank you! We will call you every week to check if you can host guests for meals. Goodbye!</Say>
</Response>`;

        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      } else {
        // Create new apartment record for meal hosting
        await supabase
          .from("apartments")
          .insert({
            phone_number: phoneNumber,
            number_of_rooms: 0, // Meal only, no beds
            address: "Meal host - Address pending",
            call_frequency: "weekly",
            available_beds: 0,
            preferences: "Meal host only",
            special_instructions: "Registered for meal hosting",
          });

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Thank you for registering! We will call you every week to check if you can host guests for meals. Goodbye!</Say>
</Response>`;

        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }
    } else if (digits === "2") {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Registration cancelled. Goodbye!</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Invalid input
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Invalid selection. Goodbye.</Say>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Error in register-meal-host:", error);
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
