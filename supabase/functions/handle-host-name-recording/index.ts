import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    
    const url = new URL(req.url);
    const apartmentId = url.searchParams.get('apartment_id');
    const from = url.searchParams.get('from');

    console.log('Host name recording:', { recordingUrl, apartmentId, from });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download and save recording
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const audioResponse = await fetch(recordingUrl + '.mp3', {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!audioResponse.ok) throw new Error('Failed to download recording');

    const audioBlob = await audioResponse.blob();
    const fileName = `host-registrations/${apartmentId}-${Date.now()}.mp3`;

    // Upload to Supabase Storage (use voicemail-recordings bucket for consistency)
    const { error: uploadError } = await supabase.storage
      .from('voicemail-recordings')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('voicemail-recordings')
      .getPublicUrl(fileName);

    // Save to voicemail box 99 for admin review
    const { data: voicemailBox } = await supabase
      .from('voicemail_boxes')
      .select('id')
      .eq('box_number', '99')
      .single();
    
    if (!voicemailBox) {
      console.error('ERROR: Voicemail box 99 does not exist! Creating it now...');
      
      // Create box 99 if it doesn't exist
      const { data: newBox } = await supabase
        .from('voicemail_boxes')
        .insert({
          box_number: '99',
          box_name: 'Host Name Recordings',
          description: 'Name recordings from host registration system',
          is_active: true,
          priority_level: 50
        })
        .select('id')
        .single();
      
      if (newBox) {
        const { data: newVoicemail } = await supabase.from('voicemails').insert({
          voicemail_box_id: newBox.id,
          caller_phone: from,
          caller_name: `Host Registration - Apt ${apartmentId}`,
          recording_url: urlData.publicUrl,
          recording_sid: recordingSid,
          duration_seconds: parseInt(recordingDuration) || 0,
          call_sid: recordingSid,
          status: 'new',
          listened: false
        }).select();
        console.log('Created box 99 and saved voicemail successfully');
        
        // Trigger email notification
        if (newVoicemail && newVoicemail[0]) {
          fetch(`${supabaseUrl}/functions/v1/send-voicemail-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ voicemailId: newVoicemail[0].id })
          }).catch(err => console.error('Email send failed:', err));
        }
      }
    } else {
      const { data: newVoicemail } = await supabase.from('voicemails').insert({
        voicemail_box_id: voicemailBox.id,
        caller_phone: from,
        caller_name: `Host Registration - Apt ${apartmentId}`,
        recording_url: urlData.publicUrl,
        recording_sid: recordingSid,
        duration_seconds: parseInt(recordingDuration) || 0,
        call_sid: recordingSid,
        status: 'new',
        listened: false
      }).select();
      
      console.log('Voicemail saved successfully to box 99');
      
      // Trigger email notification
      if (newVoicemail && newVoicemail[0]) {
        fetch(`${supabaseUrl}/functions/v1/send-voicemail-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voicemailId: newVoicemail[0].id })
        }).catch(err => console.error('Email send failed:', err));
      }
    }

    // Update apartment record with the name recording URL
    if (apartmentId) {
      await supabase
        .from('apartments')
        .update({ 
          name_recording_url: urlData.publicUrl 
        })
        .eq('id', apartmentId);
      
      console.log('Updated apartment with name recording URL');
    }

    // Return success - don't send TwiML since this is a callback
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Error in handle-host-name-recording:', error);
    return new Response('OK', { status: 200 });
  }
});
