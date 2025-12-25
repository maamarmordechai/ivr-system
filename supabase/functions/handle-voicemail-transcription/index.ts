import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

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
    const formData = await req.formData();
    const transcriptionText = formData.get("TranscriptionText")?.toString() || "";
    const recordingSid = formData.get("RecordingSid")?.toString() || "";
    const callSid = formData.get("CallSid")?.toString() || "";

    console.log("Transcription received - Call SID:", callSid, "Recording SID:", recordingSid);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Update voicemail with transcription
    const { error } = await supabase
      .from('voicemails')
      .update({
        transcription: transcriptionText,
        recording_sid: recordingSid
      })
      .eq('call_sid', callSid);

    if (error) {
      console.error("Error updating transcription:", error);
    } else {
      console.log("Transcription saved successfully");
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Error handling transcription:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
