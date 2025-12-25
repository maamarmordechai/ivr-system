import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

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
    const recordingUrl = formData.get("RecordingUrl")?.toString() || "";
    const recordingSid = formData.get("RecordingSid")?.toString() || "";
    const from = formData.get("From")?.toString() || "";
    const callSid = formData.get("CallSid")?.toString() || "";
    const recordingDuration = formData.get("RecordingDuration")?.toString() || "0";
    const recordingStatus = formData.get("RecordingStatus")?.toString() || "";
    
    const url = new URL(req.url);
    const boxId = url.searchParams.get("box_id") || "";
    const callSidFromUrl = url.searchParams.get("call_sid") || callSid;
    const fromParam = url.searchParams.get("from") || "";
    const fromNumber = fromParam.startsWith('+') ? fromParam : `+${fromParam}`;

    console.log("=== VOICEMAIL WEBHOOK CALLED ===");
    console.log("Box ID:", boxId);
    console.log("Call SID:", callSidFromUrl);
    console.log("From:", fromNumber);
    console.log("Recording URL:", recordingUrl);
    console.log("Recording SID:", recordingSid);
    console.log("Recording Status:", recordingStatus);
    console.log("Duration:", recordingDuration);
    console.log("Twilio Credentials Present:", !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN);

    // For recordingStatusCallback, just return 200 OK with empty response
    if (recordingStatus === "completed" && recordingUrl) {
      console.log("Recording completed - saving to database");
    } else {
      console.log("Recording not yet completed - returning empty response");
      return new Response("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain", ...corsHeaders }
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Download the recording from Twilio and upload to Supabase Storage
    let supabaseStorageUrl = recordingUrl; // Fallback to Twilio URL
    
    if (recordingUrl && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try {
        console.log("Downloading recording from Twilio...");
        const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
        
        const response = await fetch(recordingUrl, {
          headers: {
            'Authorization': authHeader
          }
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const fileName = `voicemails/${callSidFromUrl}-${recordingSid || Date.now()}.mp3`;
          
          console.log("Uploading to Supabase Storage:", fileName);
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('voicemail-recordings')
            .upload(fileName, audioBlob, {
              contentType: 'audio/mpeg',
              upsert: true
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
          } else {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('voicemail-recordings')
              .getPublicUrl(fileName);
            
            supabaseStorageUrl = publicUrlData.publicUrl;
            console.log("Uploaded successfully to:", supabaseStorageUrl);
          }
        } else {
          console.error("Failed to fetch recording from Twilio:", response.status, response.statusText);
        }
      } catch (downloadError) {
        console.error("Error downloading/uploading recording:", downloadError);
      }
    } else {
      console.log("Twilio credentials not configured, using Twilio URL directly");
    }

    // Check if voicemail already exists for this call
    const { data: existingVoicemail } = await supabase
      .from('voicemails')
      .select('id')
      .eq('call_sid', callSidFromUrl)
      .maybeSingle();

    if (existingVoicemail) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('voicemails')
        .update({
          recording_url: supabaseStorageUrl,
          recording_sid: recordingSid,
          duration_seconds: parseInt(recordingDuration),
          status: 'new'
        })
        .eq('id', existingVoicemail.id);

      if (updateError) {
        console.error("Error updating voicemail:", updateError);
      } else {
        console.log("Voicemail updated successfully");
      }
    } else {
      // Create new record
      const insertData = {
        voicemail_box_id: boxId,
        caller_phone: fromNumber,
        recording_url: supabaseStorageUrl,
        recording_sid: recordingSid,
        duration_seconds: parseInt(recordingDuration),
        call_sid: callSidFromUrl,
        status: 'new'
      };
      
      console.log("Attempting to insert voicemail:", JSON.stringify(insertData));
      
      const { data, error: insertError } = await supabase
        .from('voicemails')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("Error saving voicemail:", JSON.stringify(insertError));
        console.error("Insert data was:", JSON.stringify(insertData));
      } else {
        console.log("Voicemail saved successfully:", JSON.stringify(data));
        
        // Trigger email notification asynchronously
        if (data && data[0]) {
          fetch(`${SUPABASE_URL}/functions/v1/send-voicemail-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ voicemailId: data[0].id })
          }).catch(emailError => {
            console.error('Failed to send email notification:', emailError);
          });
        }
      }
    }

    // Return 200 OK for recordingStatusCallback
    return new Response("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain", ...corsHeaders }
    });
  } catch (error) {
    console.error("Error handling voicemail:", error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Thank you. Goodbye.</Say>
</Response>`;
    return new Response(twiml, {
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });
  }
});
