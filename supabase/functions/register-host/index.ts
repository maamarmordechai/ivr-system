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
    const step = new URL(req.url).searchParams.get("step");
    const apartmentId = new URL(req.url).searchParams.get("apartment_id");
    const digits = formData.get("Digits");
    const recordingUrl = formData.get("RecordingUrl");
    const recordingSid = formData.get("RecordingSid");

    console.log("Register Host - Step:", step, "From:", from, "Digits:", digits, "ApartmentId:", apartmentId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const phoneNumber = String(from).replace(/\D/g, "");

    // Step 1: Initial - Ask for bed count
    if (!step) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Welcome to host registration.</Say>
    <Gather numDigits="2" action="${supabaseUrl}/functions/v1/register-host?step=process_beds&amp;from=${encodeURIComponent(from)}" method="POST" timeout="15">
        <Say voice="man" language="en-US">How many beds can you provide? Enter a number now.</Say>
    </Gather>
    <Say voice="man" language="en-US">We did not receive your response. Goodbye.</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Step 2: After bed count, create apartment and record name
    if (step === "process_beds" && digits && digits !== "#" && digits !== "") {
      const bedCount = parseInt(digits);
      
      console.log("Processing bed count:", bedCount, "Phone:", phoneNumber);
      
      if (isNaN(bedCount) || bedCount < 1 || bedCount > 20) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Invalid number. Please enter a number between 1 and 20.</Say>
    <Redirect method="POST">${supabaseUrl}/functions/v1/register-host</Redirect>
</Response>`;
        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      // Check if apartment already exists
      const { data: existingApt, error: checkError } = await supabase
        .from("apartments")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      console.log("Existing apartment check:", existingApt, "Error:", checkError);

      let apartmentId;
      
      if (existingApt) {
        // Update existing apartment
        const { data: updatedApt, error: updateError } = await supabase
          .from("apartments")
          .update({
            number_of_beds: bedCount,
            call_frequency: "weekly",
          })
          .eq("id", existingApt.id)
          .select("id")
          .single();
        
        console.log("Updated apartment:", updatedApt, "Error:", updateError);
        
        if (updateError) {
          console.error("Error updating apartment:", updateError);
          throw updateError;
        }
        apartmentId = updatedApt.id;
      } else {
        // Create new apartment
        const { data: newApt, error: aptError } = await supabase
          .from("apartments")
          .insert({
            phone_number: phoneNumber,
            person_name: "Name pending",
            number_of_beds: bedCount,
            number_of_rooms: 1,
            address: "Address pending",
            call_frequency: "weekly",
          })
          .select("id")
          .single();

        console.log("Created apartment:", newApt, "Error:", aptError);
        
        if (aptError) {
          console.error("Error creating apartment:", aptError);
          throw aptError;
        }
        apartmentId = newApt.id;
      }
      
      if (!apartmentId) {
        console.error("No apartment ID available");
        throw new Error("Failed to get apartment ID");
      }
      
      console.log("Final apartment ID:", apartmentId);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Thank you for offering ${bedCount} beds.</Say>
    <Say voice="man" language="en-US">Please record your name after the beep so we can contact you.</Say>
    <Record maxLength="10" playBeep="true" recordingStatusCallback="${supabaseUrl}/functions/v1/handle-host-name-recording?apartment_id=${apartmentId}&amp;from=${encodeURIComponent(from)}" action="${supabaseUrl}/functions/v1/register-host?step=weekly_calls&amp;apartment_id=${apartmentId}" method="POST" />
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Step 3: Call frequency question
    if (step === "weekly_calls" && apartmentId) {
      // If recording just finished (has # or empty digits), ask the question
      if (digits === "#" || digits === "" || recordingSid) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Thank you.</Say>
    <Gather numDigits="1" action="${supabaseUrl}/functions/v1/register-host?step=weekly_calls&amp;apartment_id=${apartmentId}" method="POST" timeout="15">
        <Say voice="man" language="en-US">How often should we call you? Press 1 for every week, 2 for every second week, 3 for once a month, or 4 for only busy weeks.</Say>
    </Gather>
    <Say voice="man" language="en-US">We didn't receive your response. Goodbye.</Say>
</Response>`;

        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      // Process call frequency answer
      if (digits === "1" || digits === "2" || digits === "3" || digits === "4") {
        let callFrequency;
        switch(digits) {
          case "1": callFrequency = "weekly"; break;
          case "2": callFrequency = "bi-weekly"; break;
          case "3": callFrequency = "monthly"; break;
          case "4": callFrequency = "desperate-only"; break;
        }
        
        await supabase
          .from("apartments")
          .update({ call_frequency: callFrequency })
          .eq("id", apartmentId);

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="${supabaseUrl}/functions/v1/register-host?step=private_entrance&amp;apartment_id=${apartmentId}" method="POST" timeout="15">
        <Say voice="man" language="en-US">Does your accommodation have a private entrance? Press 1 for yes, 2 for no.</Say>
    </Gather>
    <Say voice="man" language="en-US">We didn't receive your response. Goodbye.</Say>
</Response>`;

        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }
    }

    // Step 4: Private entrance question
    if (step === "private_entrance" && apartmentId && digits) {
      const hasPrivateEntrance = digits === "1" ? "Has private entrance" : "No private entrance";
      
      await supabase
        .from("apartments")
        .update({ 
          special_instructions: hasPrivateEntrance 
        })
        .eq("id", apartmentId);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Thank you for registering as a host! We will contact you when guests need accommodation. Goodbye!</Say>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Default fallback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="man" language="en-US">Thank you for your interest. Goodbye.</Say>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Error in register-host:", error);
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
