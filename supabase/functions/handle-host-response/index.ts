import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    
    const url = new URL(req.url);
    const weekId = url.searchParams.get('week_id');
    const apartmentId = url.searchParams.get('apartment_id');
    const updateMode = url.searchParams.get('update_mode') === 'true';
    const existingBeds = parseInt(url.searchParams.get('existing_beds') || '0');

    console.log('Host response:', { digits, from, callSid, weekId, apartmentId, updateMode, existingBeds });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get audio settings
    const { data: audioSettings } = await supabase
      .from('bed_audio_settings')
      .select('*')
      .eq('is_active', true);
    
    const audioMap = new Map(audioSettings?.map(a => [a.audio_key, a]) || []);
    
    const playAudio = (key: string, replacements?: Record<string, string>) => {
      const audio = audioMap.get(key);
      if (!audio) return '';
      
      if (audio.audio_url) {
        return `<Play>${audio.audio_url}</Play>`;
      } else if (audio.default_text) {
        let text = audio.default_text;
        if (replacements) {
          for (const [key, value] of Object.entries(replacements)) {
            text = text.replace(`{${key}}`, value);
          }
        }
        return `<Say voice="man" language="he-IL">${text}</Say>`;
      }
      return '';
    };

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Get apartment info
    const { data: apartment } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (!apartment) {
      twiml += `<Say voice="man" language="he-IL">Error finding your information. Please try again.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Handle UPDATE MODE - they already confirmed this week
    if (updateMode) {
      if (digits === '0') {
        // Keep existing confirmation
        twiml += playAudio('thank_you_message');
        twiml += `<Say voice="man" language="he-IL">Your previous confirmation of ${existingBeds} beds remains active. Thank you.</Say>`;
        twiml += `</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      } else if (digits === '1') {
        // Update - ask for new bed count
        twiml += `<Gather numDigits="2" action="${supabaseUrl}/functions/v1/handle-host-update-beds?week_id=${weekId}&amp;apartment_id=${apartmentId}&amp;previous_beds=${existingBeds}" method="POST" timeout="10">`;
        twiml += `<Say voice="man" language="he-IL">You currently have ${existingBeds} beds confirmed. How many beds can you provide now? Enter a number, or press 0 to cancel.</Say>`;
        twiml += `</Gather>`;
        twiml += `<Say voice="man" language="he-IL">We did not receive your response. Goodbye.</Say>`;
        twiml += `</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }
    }

    // NORMAL MODE - New confirmation
    if (digits === '1') {
      // YES - Confirm all beds available
      
      // Create bed confirmation record
      await supabase
        .from('bed_confirmations')
        .insert({
          week_id: weekId,
          apartment_id: apartmentId,
          beds_confirmed: apartment.number_of_beds,
          confirmed_via: 'phone_call'
        });

      // Increment beds in weekly tracking
      await supabase.rpc('increment_beds_confirmed', {
        p_week_id: weekId,
        p_beds: apartment.number_of_beds
      });

      // Update apartment last helped
      await supabase
        .from('apartments')
        .update({
          last_helped_date: new Date().toISOString().split('T')[0],
          times_helped: (apartment.times_helped || 0) + 1
        })
        .eq('id', apartmentId);

      twiml += playAudio('thank_you_message');
      twiml += `</Response>`;

    } else if (digits === '2') {
      // NO - Not available this week
      twiml += playAudio('thank_you_message');
      twiml += `</Response>`;

    } else if (digits === '3') {
      // PARTIAL - Only some beds available
      twiml += `<Gather numDigits="2" action="${supabaseUrl}/functions/v1/handle-partial-beds?week_id=${weekId}&amp;apartment_id=${apartmentId}" method="POST" timeout="10">`;
      twiml += playAudio('partial_beds_prompt');
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="he-IL">We did not receive your response. Goodbye.</Say>`;
      twiml += `</Response>`;

    } else if (digits === '9') {
      // CALLBACK FRIDAY - Schedule callback
      twiml += playAudio('callback_friday_confirm');
      
      // TODO: Create callback queue entry for Friday
      // This would be stored in a separate table or flag
      await supabase
        .from('incoming_calls')
        .insert({
          phone_number: from,
          call_sid: callSid,
          week_id: weekId,
          apartment_id: apartmentId,
          status: 'callback_friday',
          notes: 'Requested callback on Friday'
        });

      twiml += `</Response>`;

    } else {
      // Invalid option - retry
      twiml += `<Say voice="man" language="he-IL">Sorry, that's not a valid option.</Say>`;
      twiml += `<Redirect>${supabaseUrl}/functions/v1/open-call-system</Redirect>`;
      twiml += `</Response>`;
    }

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-host-response:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="he-IL">Sorry, there was an error. Please try again later.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
