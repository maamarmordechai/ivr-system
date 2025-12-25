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
    const hostId = url.searchParams.get('host_id');
    const step = url.searchParams.get('step') || 'guest_count';
    const updateMode = url.searchParams.get('update_mode') === 'true';
    const existingGuests = parseInt(url.searchParams.get('existing_guests') || '0');
    const existingDay = parseInt(url.searchParams.get('existing_day') || '0');
    const existingNight = parseInt(url.searchParams.get('existing_night') || '0');

    console.log('Meal response:', { digits, from, callSid, weekId, hostId, step, updateMode, existingGuests });

    if (!weekId || !hostId) {
      throw new Error('Missing week_id or host_id');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get audio settings
    const { data: audioSettings, error: audioError } = await supabase
      .from('meal_audio_settings')
      .select('*')
      .eq('is_active', true);

    if (audioError) throw audioError;

    const audioMap = new Map(audioSettings?.map(a => [a.audio_key, a]) || []);

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Handle UPDATE MODE - they already confirmed this week
    if (updateMode && step === 'guest_count') {
      if (digits === '0') {
        // Keep existing confirmation
        const thankYou = audioMap.get('thank_you');
        if (thankYou?.audio_url) {
          twiml += `<Play>${thankYou.audio_url}</Play>`;
        } else if (thankYou?.default_text) {
          twiml += `<Say voice="man" language="en-US">${thankYou.default_text}</Say>`;
        }
        twiml += `<Say voice="man" language="en-US">Your previous confirmation remains active. Thank you.</Say>`;
        twiml += `</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      } else if (digits === '1') {
        // Update - ask for new guest count
        const callbackUrl = `${supabaseUrl}/functions/v1/handle-meal-response?week_id=${weekId}&amp;host_id=${hostId}&amp;from=${encodeURIComponent(from)}&amp;step=guest_count&amp;updating=true`;
        
        twiml += `<Gather numDigits="1" action="${callbackUrl}" method="POST" timeout="10">`;
        twiml += `<Say voice="man" language="en-US">How many guests can you host now? Press 0 to cancel your confirmation.</Say>`;
        twiml += `</Gather>`;
        twiml += `<Say voice="man" language="en-US">We did not receive your response. Goodbye.</Say>`;
        twiml += `</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }
    }

    // NORMAL MODE - New confirmation or updating
    if (step === 'guest_count') {
      const guestCount = parseInt(digits);

      if (guestCount === 0) {
        // Host cannot host this week
        await supabase.from('meal_availabilities').upsert({
          week_id: weekId,
          host_id: hostId,
          day_meal_guests: 0,
          night_meal_guests: 0,
          status: 'unavailable',
          responded_at: new Date().toISOString()
        });

        const thankYou = audioMap.get('thank_you');
        if (thankYou?.audio_url) {
          twiml += `<Play>${thankYou.audio_url}</Play>`;
        } else if (thankYou?.default_text) {
          twiml += `<Say voice="man" language="he-IL">${thankYou.default_text}</Say>`;
        }
        
        twiml += `<Say voice="man" language="he-IL">We understand you cannot host this week. Thank you.</Say>`;
        twiml += `</Response>`;

        // Update call status
        await supabase.from('meal_calls')
          .update({ status: 'completed', ended_at: new Date().toISOString() })
          .eq('call_sid', callSid);

        return new Response(twiml, {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      // Store guest count temporarily and ask for meal selection
      // We'll pass it via URL parameter
      const callbackUrl = `${supabaseUrl}/functions/v1/handle-meal-response?week_id=${weekId}&amp;host_id=${hostId}&amp;from=${encodeURIComponent(from)}&amp;step=meal_selection&amp;guest_count=${guestCount}`;
      
      twiml += `<Gather numDigits="1" action="${callbackUrl}" method="POST" timeout="10">`;
      
      const mealSelection = audioMap.get('meal_selection');
      
      if (mealSelection?.audio_url) {
        twiml += `<Play>${mealSelection.audio_url}</Play>`;
      } else if (mealSelection?.default_text) {
        twiml += `<Say voice="man" language="he-IL">${mealSelection.default_text}</Say>`;
      }
      
      twiml += `<Say voice="man" language="he-IL">Press a digit now.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="he-IL">We did not receive your response. Goodbye.</Say>`;
      twiml += `</Response>`;

    } else if (step === 'meal_selection') {
      const guestCount = parseInt(url.searchParams.get('guest_count') || '0');
      const mealChoice = parseInt(digits);

      let dayMealGuests = 0;
      let nightMealGuests = 0;
      let confirmationAudioKey = 'thank_you';

      if (mealChoice === 1) {
        // Night meal only (Friday dinner)
        nightMealGuests = guestCount;
        confirmationAudioKey = 'night_meal_only';
      } else if (mealChoice === 2) {
        // Day meal only (Saturday lunch)
        dayMealGuests = guestCount;
        confirmationAudioKey = 'day_meal_only';
      } else if (mealChoice === 3) {
        // Both meals
        dayMealGuests = guestCount;
        nightMealGuests = guestCount;
        confirmationAudioKey = 'both_meals';
      }

      // Save to database - use upsert with proper conflict resolution
      const { error: upsertError } = await supabase
        .from('meal_availabilities')
        .upsert({
          week_id: weekId,
          host_id: hostId,
          day_meal_guests: dayMealGuests,
          night_meal_guests: nightMealGuests,
          status: 'confirmed',
          call_sid: callSid,
          responded_at: new Date().toISOString()
        }, {
          onConflict: 'week_id,host_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting meal availability:', upsertError);
      }

      // Play confirmation message
      const confirmation = audioMap.get(confirmationAudioKey);
      if (confirmation?.audio_url) {
        twiml += `<Play>${confirmation.audio_url}</Play>`;
      } else if (confirmation?.default_text) {
        twiml += `<Say voice="man" language="he-IL">${confirmation.default_text}</Say>`;
      }

      const thankYou = audioMap.get('thank_you');
      if (thankYou?.audio_url) {
        twiml += `<Play>${thankYou.audio_url}</Play>`;
      } else if (thankYou?.default_text) {
        twiml += `<Say voice="man" language="he-IL">${thankYou.default_text}</Say>`;
      }

      twiml += `</Response>`;

      // Update call status
      await supabase.from('meal_calls')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('call_sid', callSid);
    }

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-meal-response:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="he-IL">Sorry, there was an error processing your response. Please try again later.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
