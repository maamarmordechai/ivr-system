import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function is called immediately after user finishes recording
    // The actual recording is saved asynchronously via recordingStatusCallback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Thank you for your message. Goodbye.</Say>
  <Hangup/>
</Response>`;
    
    return new Response(twiml, {
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });
  } catch (error) {
    console.error("Error in handle-voicemail-complete:", error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`;
    
    return new Response(errorTwiml, {
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });
  }
});
