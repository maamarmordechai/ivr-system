// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Handle both JSON and FormData (Twilio redirects)
    let step, digits, boxId, currentIndex, vmId;
    
    const url = new URL(req.url);
    const contentType = req.headers.get("content-type");
    
    // Try to read form data (Twilio sends this)
    let formData;
    try {
      formData = await req.formData();
    } catch {
      formData = null;
    }
    
    // Get parameters from URL and form data
    step = url.searchParams.get("step") || "list_boxes";
    digits = formData?.get("Digits") as string;
    boxId = url.searchParams.get("boxId");
    currentIndex = parseInt(url.searchParams.get("currentIndex") || "0");
    vmId = url.searchParams.get("vmId");

    console.log("Check voicemails:", { step, digits, boxId, currentIndex, vmId });

    // Step 1: List available voicemail boxes
    if (step === "list_boxes") {
      const { data: boxes } = await supabase
        .from("voicemail_boxes")
        .select("id, box_number, box_name")
        .eq("is_active", true)
        .order("box_number");

      if (!boxes || boxes.length === 0) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">No voicemail boxes configured. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      twiml += `<Say voice="alice">Voicemail management system.</Say>`;
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/check-voicemails-ivr?step=select_box" method="POST" timeout="15">`;
      twiml += `<Say voice="alice">Select a voicemail box. `;
      
      boxes.forEach((box: any, index: number) => {
        twiml += `Press ${index + 1} for ${box.box_name}. `;
      });
      
      twiml += `Press 0 to exit.</Say></Gather>`;
      twiml += `<Say voice="alice">No selection made. Goodbye.</Say>`;
      twiml += `<Hangup/>`;
      twiml += `</Response>`;

      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Step 2: Select box and count voicemails
    if (step === "select_box") {
      if (digits === "0") {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      const boxIndex = parseInt(digits || "0") - 1;
      
      const { data: boxes } = await supabase
        .from("voicemail_boxes")
        .select("id, box_number, box_name")
        .eq("is_active", true)
        .order("box_number");

      if (!boxes || boxIndex < 0 || boxIndex >= boxes.length) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Invalid selection. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      const selectedBox = boxes[boxIndex];
      
      // Get unlistened voicemails
      const { data: voicemails } = await supabase
        .from("voicemails")
        .select("id, caller_phone, caller_name, recording_url, created_at")
        .eq("voicemail_box_id", selectedBox.id)
        .eq("listened", false)
        .order("created_at", { ascending: false });

      const count = voicemails?.length || 0;

      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      twiml += `<Say voice="alice">You have ${count} new voicemail${count !== 1 ? 's' : ''}.</Say>`;

      if (count > 0) {
        twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/check-voicemails-ivr?step=play_message&amp;boxId=${selectedBox.id}&amp;currentIndex=0" method="POST" timeout="10">`;
        twiml += `<Say voice="alice">Press 1 to listen, or press 0 to exit.</Say>`;
        twiml += `</Gather>`;
      }
      
      twiml += `<Say voice="alice">Goodbye.</Say>`;
      twiml += `<Hangup/>`;
      twiml += `</Response>`;

      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Step 3: Play voicemail message
    if (step === "play_message") {
      // Check if user wants to exit (only if digits present from a Gather)
      if (digits && digits === "0") {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      if (!boxId) {
        console.error("No boxId provided for play_message");
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">System error. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      console.log("Fetching voicemails for box:", boxId, "currentIndex:", currentIndex);

      const { data: voicemails, error: vmError } = await supabase
        .from("voicemails")
        .select("id, caller_phone, caller_name, recording_url, created_at")
        .eq("voicemail_box_id", boxId)
        .eq("listened", false)
        .order("created_at", { ascending: false });

      if (vmError) {
        console.error("Error fetching voicemails:", vmError);
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Database error. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      if (!voicemails || voicemails.length === 0) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">No more voicemails. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      const currentVoicemail = voicemails[currentIndex];
      
      if (!currentVoicemail) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">No more voicemails. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      // Mark as listened
      await supabase
        .from("voicemails")
        .update({ 
          listened: true,
          listened_at: new Date().toISOString()
        })
        .eq("id", currentVoicemail.id);

      // Format phone number with spaces for better pronunciation
      let callerInfo;
      if (currentVoicemail.caller_name) {
        callerInfo = currentVoicemail.caller_name;
      } else if (currentVoicemail.caller_phone) {
        // Format phone number: +1 845 376 2437 becomes "8 4 5, 3 7 6, 2 4 3 7"
        const phone = currentVoicemail.caller_phone.replace(/^\+1/, '').replace(/\D/g, '');
        callerInfo = phone.split('').join(' ');
      } else {
        callerInfo = "Unknown caller";
      }
      
      // Ensure recording URL is valid
      let recordingUrl = currentVoicemail.recording_url;
      if (!recordingUrl) {
        console.error("No recording URL for voicemail:", currentVoicemail.id);
        recordingUrl = "";
      }
      
      console.log("Playing voicemail:", currentVoicemail.id, "URL:", recordingUrl);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Message ${currentIndex + 1} of ${voicemails.length}. From ${callerInfo}.</Say>
  <Gather numDigits="1" action="${supabaseUrl}/functions/v1/check-voicemails-ivr?step=message_action&amp;boxId=${boxId}&amp;currentIndex=${currentIndex}&amp;vmId=${currentVoicemail.id}" method="POST">
    <Play>${recordingUrl}</Play>
    <Say voice="alice">Press 1 to delete. Press 2 to continue. Press 3 to replay. Press 0 to exit.</Say>
  </Gather>
  <Say voice="alice">Goodbye.</Say>
  <Hangup/>
</Response>`;

      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Step 4: Handle message actions
    if (step === "message_action") {
      if (digits === "0") {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      const { data: voicemails } = await supabase
        .from("voicemails")
        .select("id")
        .eq("voicemail_box_id", boxId)
        .eq("listened", false)
        .order("created_at", { ascending: false });

      if (digits === "1") {
        // Delete message
        await supabase
          .from("voicemails")
          .delete()
          .eq("id", vmId);

        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        twiml += `<Say voice="alice">Message deleted.</Say>`;

        // Check if more messages
        const remainingCount = (voicemails?.length || 1) - 1;
        if (remainingCount > 0) {
          twiml += `<Redirect>${supabaseUrl}/functions/v1/check-voicemails-ivr?step=play_message&amp;boxId=${boxId}&amp;currentIndex=${currentIndex}</Redirect>`;
        } else {
          twiml += `<Say voice="alice">No more voicemails. Goodbye.</Say>`;
          twiml += `<Hangup/>`;
        }
        twiml += `</Response>`;

        return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
      }

      if (digits === "2") {
        // Keep and go to next
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        
        if (voicemails && currentIndex + 1 < voicemails.length) {
          twiml += `<Redirect>${supabaseUrl}/functions/v1/check-voicemails-ivr?step=play_message&amp;boxId=${boxId}&amp;currentIndex=${currentIndex + 1}</Redirect>`;
        } else {
          twiml += `<Say voice="alice">No more voicemails. Goodbye.</Say>`;
          twiml += `<Hangup/>`;
        }
        twiml += `</Response>`;

        return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
      }

      if (digits === "3") {
        // Replay current message
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Redirect>${supabaseUrl}/functions/v1/check-voicemails-ivr?step=play_message&amp;boxId=${boxId}&amp;currentIndex=${currentIndex}</Redirect>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      // Default: invalid input
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Invalid selection. Goodbye.</Say>
          <Hangup/>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Default fallback
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Invalid request. Goodbye.</Say>
        <Hangup/>
      </Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error) {
    console.error("Error in check-voicemails-ivr:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">System error. Goodbye.</Say>
        <Hangup/>
      </Response>`,
      { headers: { "Content-Type": "text/xml" }, status: 200 }
    );
  }
});
