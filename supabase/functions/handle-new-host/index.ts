import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    
    const url = new URL(req.url);
    const weekId = url.searchParams.get('week_id');
    const apartmentId = url.searchParams.get('apartment_id');
    const step = url.searchParams.get('step') || 'initial';

    console.log('New host registration:', { digits, from, callSid, weekId, step, apartmentId, recordingSid });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Handle recording completion (when user finishes recording name)
    if (recordingSid && apartmentId) {
      console.log('Name recording completed, asking about weekly calls');
      twiml += `<Say voice="man" language="en-US">Thank you.</Say>`;
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-new-host?step=weekly_calls&amp;apartment_id=${apartmentId}" method="POST" timeout="15">`;
      twiml += `<Say voice="man" language="en-US">Would you like us to call you every week to check availability? Press 1 for yes, 2 for no.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="en-US">We didn't receive your response. Goodbye.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Handle weekly calls response
    if (step === 'weekly_calls' && apartmentId && digits) {
      const wantsWeeklyCalls = digits === '1';
      await supabase
        .from('apartments')
        .update({ wants_weekly_calls: wantsWeeklyCalls })
        .eq('id', apartmentId);
      
      console.log('Weekly calls preference saved, asking about private entrance');
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-new-host?step=private_entrance&amp;apartment_id=${apartmentId}" method="POST" timeout="15">`;
      twiml += `<Say voice="man" language="en-US">Does your accommodation have a private entrance? Press 1 for yes, 2 for no.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="en-US">We didn't receive your response. Goodbye.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Handle private entrance response
    if (step === 'private_entrance' && apartmentId && digits) {
      const hasPrivateEntrance = digits === '1';
      // Note: You may need to add a private_entrance column to apartments table
      // For now, we'll store it in instructions
      const { data: apt } = await supabase
        .from('apartments')
        .select('instructions')
        .eq('id', apartmentId)
        .single();
      
      const updatedInstructions = `${apt?.instructions || ''}\nPrivate entrance: ${hasPrivateEntrance ? 'Yes' : 'No'}`.trim();
      
      await supabase
        .from('apartments')
        .update({ instructions: updatedInstructions })
        .eq('id', apartmentId);
      
      console.log('Registration complete');
      twiml += `<Say voice="man" language="en-US">Thank you for registering! We will contact you if we need your help. Goodbye!</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Initial bed count entry (don't validate if it's just # or empty from recording end)
    if (!digits || digits === '#' || digits.trim() === '') {
      twiml += `<Say voice="man" language="en-US">Thank you for your registration. Goodbye!</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    const bedCount = parseInt(digits);

    if (!bedCount || bedCount < 1 || isNaN(bedCount)) {
      twiml += `<Say voice="man" language="en-US">Invalid number. Please call back and try again.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Create temporary apartment record (will be updated with name from voicemail)
    console.log('Attempting to create apartment:', { from, bedCount });
    
    const apartmentData = {
      phone_number: from,
      number_of_beds: bedCount,
      wants_weekly_calls: false,
      person_name: `New Host ${from}`,
      address: 'Address pending',
      call_frequency: 'weekly',
      call_priority: 1,
      available_this_week: false,
      has_kitchenette: false,
      is_family_friendly: false,
      has_crib: false,
      couple_friendly: true,
      is_active: true,
      room_name: 'Main Room',
      number_of_rooms: 1
    };
    
    console.log('Apartment data to insert:', JSON.stringify(apartmentData));
    
    const { data: newApartment, error: insertError } = await supabase
      .from('apartments')
      .insert(apartmentData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating apartment:', JSON.stringify(insertError, null, 2));
      twiml += `<Say voice="man" language="en-US">There was an error registering. Error code: ${insertError.code || 'unknown'}. Please contact support.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }
    
    console.log('Apartment created successfully:', newApartment);

    // Update weekly tracking
    await supabase.rpc('increment_beds_confirmed', {
      p_week_id: weekId,
      p_beds: bedCount
    });

    // Create bed confirmation record
    if (newApartment) {
      await supabase
        .from('bed_confirmations')
        .insert({
          week_id: weekId,
          apartment_id: newApartment.id,
          beds_confirmed: bedCount,
          confirmed_via: 'phone_call'
        });
    }

    twiml += `<Say voice="man" language="en-US">Thank you for offering ${bedCount} bed${bedCount > 1 ? 's' : ''} this week.</Say>`;
    twiml += `<Say voice="man" language="en-US">Please record your name after the beep so we can contact you.</Say>`;
    
    // Record the name - use recordingStatusCallback to save in background, action to continue flow
    twiml += `<Record maxLength="10" playBeep="true" `;
    twiml += `recordingStatusCallback="${supabaseUrl}/functions/v1/handle-host-name-recording?apartment_id=${newApartment.id}&amp;from=${encodeURIComponent(from)}" `;
    twiml += `action="${supabaseUrl}/functions/v1/handle-new-host?step=weekly_calls&amp;apartment_id=${newApartment.id}" `;
    twiml += `method="POST" />`;
    
    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-new-host:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="en-US">Sorry, there was an error. Please try again later.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
