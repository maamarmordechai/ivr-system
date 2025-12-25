import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const formData = await req.formData();
    
    // Get 'from' from URL params (when redirected) or form data (direct call)
    const from = url.searchParams.get('from') || formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    
    // Get week_id and host_id from URL params if provided (when automated call is made)
    const weekIdParam = url.searchParams.get('week_id');
    const hostIdParam = url.searchParams.get('host_id');
    const isAutomatedCall = !!hostIdParam; // If host_id provided, it's an automated call

    console.log('Incoming meal call from:', from, 'week_id:', weekIdParam, 'host_id:', hostIdParam, 'automated:', isAutomatedCall);

    if (!from) {
      throw new Error('No phone number provided in From parameter or URL');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current week - use provided week_id or find current week
    let weekData;
    if (weekIdParam) {
      const { data, error: weekError } = await supabase
        .from('desperate_weeks')
        .select('*')
        .eq('id', weekIdParam)
        .single();
      
      if (weekError) throw new Error('Week not found');
      weekData = data;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: weekError } = await supabase
        .from('desperate_weeks')
        .select('*')
        .gte('week_end_date', today)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (weekError || !data) {
        throw new Error('No current week configured');
      }
      weekData = data;
    }

    // Determine host - use provided host_id if available (automated call), otherwise lookup by phone
    let hostId;
    let host;
    
    if (hostIdParam) {
      // Automated call - use the provided host_id
      hostId = hostIdParam;
      const { data: hostData } = await supabase
        .from('meal_hosts')
        .select('*')
        .eq('id', hostId)
        .single();
      host = hostData;
    } else {
      // Direct call or manual - lookup by phone number
      // Try exact match first
      const { data: hostData } = await supabase
        .from('meal_hosts')
        .select('*')
        .eq('phone_number', from)
        .maybeSingle();

      host = hostData;
      hostId = host?.id;

      // If not found, try fuzzy matching (strip non-digits and compare)
      if (!hostId) {
        const digitsOnly = from.replace(/\D/g, '');
        const { data: allHosts } = await supabase
          .from('meal_hosts')
          .select('*');
        
        // Find match by comparing digits only
        host = allHosts?.find(h => {
          const hostDigits = h.phone_number?.replace(/\D/g, '');
          return hostDigits === digitsOnly || 
                 hostDigits === digitsOnly.slice(-10) || // Last 10 digits
                 digitsOnly === hostDigits?.slice(-10);
        });
        
        hostId = host?.id;
      }

      // If still not registered, create new host
      if (!hostId) {
        const { data: newHost, error: createError } = await supabase
          .from('meal_hosts')
          .insert({
            host_name: `New Host ${from}`,
            phone_number: from
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating meal host:', createError);
          throw createError;
        }
        hostId = newHost.id;
        host = newHost;
      }
    }

    console.log('Host lookup result:', { hostId, hostName: host?.host_name, hostPhone: host?.phone_number });

    const weekId = weekData.id;

    // Check if host already confirmed for this week
    const { data: existingAvailability, error: availError } = await supabase
      .from('meal_availabilities')
      .select('*')
      .eq('week_id', weekId)
      .eq('host_id', hostId)
      .maybeSingle();

    console.log('Existing availability check:', { 
      weekId, 
      hostId, 
      found: !!existingAvailability, 
      status: existingAvailability?.status,
      dayGuests: existingAvailability?.day_meal_guests,
      nightGuests: existingAvailability?.night_meal_guests,
      error: availError
    });

    // Get audio settings (fallback if table doesn't exist)
    const { data: audioSettings } = await supabase
      .from('meal_audio_settings')
      .select('*')
      .eq('is_active', true);

    // Create a map of audio settings
    const audioMap = new Map(audioSettings?.map(a => [a.audio_key, a]) || []);

    // Define fallback texts
    const fallbacks = {
      intro_automated: 'Hello, this is the weekly meal hosting confirmation call.',
      intro_manual: 'Welcome to the meal hosting system.',
      guest_count_prompt: 'We are looking for hosts for guests this Shabbat. How many guests can you host? Press 0 if you cannot host this week.'
    };

    // Get intro audio
    const introAudio = audioMap.get('intro');
    const guestCountPrompt = audioMap.get('guest_count_prompt');

    // Build TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (existingAvailability && existingAvailability.status !== 'unavailable') {
      // ALREADY CONFIRMED - Offer to update
      // Calculate actual guest count (if both meals, use the higher number, not sum)
      const dayGuests = existingAvailability.day_meal_guests || 0;
      const nightGuests = existingAvailability.night_meal_guests || 0;
      const actualGuestCount = Math.max(dayGuests, nightGuests);
      
      let mealType = '';
      let guestDescription = '';
      
      if (dayGuests > 0 && nightGuests > 0) {
        mealType = 'both Friday night and Saturday day meals';
        // If both meals have same count, it's the same guests for both
        if (dayGuests === nightGuests) {
          guestDescription = `${actualGuestCount} guest${actualGuestCount > 1 ? 's' : ''} for both meals`;
        } else {
          guestDescription = `${nightGuests} guest${nightGuests > 1 ? 's' : ''} for Friday night and ${dayGuests} guest${dayGuests > 1 ? 's' : ''} for Saturday`;
        }
      } else if (nightGuests > 0) {
        mealType = 'Friday night meal';
        guestDescription = `${nightGuests} guest${nightGuests > 1 ? 's' : ''} for Friday night meal`;
      } else if (dayGuests > 0) {
        mealType = 'Saturday day meal';
        guestDescription = `${dayGuests} guest${dayGuests > 1 ? 's' : ''} for Saturday day meal`;
      }

      const callbackUrl = `${supabaseUrl}/functions/v1/handle-meal-response?week_id=${weekId}&amp;host_id=${hostId}&amp;from=${encodeURIComponent(from)}&amp;update_mode=true&amp;existing_guests=${actualGuestCount}&amp;existing_day=${dayGuests}&amp;existing_night=${nightGuests}`;
      
      twiml += `<Gather numDigits="1" action="${callbackUrl}" method="POST" timeout="10">`;
      
      // Use appropriate greeting based on call type
      if (isAutomatedCall) {
        if (introAudio?.audio_url) {
          twiml += `<Play>${introAudio.audio_url}</Play>`;
        } else {
          twiml += `<Say voice="man" language="en-US">${introAudio?.default_text || fallbacks.intro_automated}</Say>`;
        }
      } else {
        twiml += `<Say voice="man" language="en-US">${fallbacks.intro_manual}</Say>`;
      }

      twiml += `<Say voice="man" language="en-US">You already confirmed ${guestDescription}.</Say>`;
      twiml += `<Say voice="man" language="en-US">Press 1 to update your availability. Press 0 if everything is correct.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="en-US">We did not receive your response. Goodbye.</Say>`;
      twiml += `</Response>`;
    } else {
      // NEW CONFIRMATION - Normal flow
      // Gather the guest count (0-9)
      const callbackUrl = `${supabaseUrl}/functions/v1/handle-meal-response?week_id=${weekId}&amp;host_id=${hostId}&amp;from=${encodeURIComponent(from)}`;
      
      twiml += `<Gather numDigits="1" action="${callbackUrl}" method="POST" timeout="10">`;
      
      // Use appropriate greeting based on call type
      if (isAutomatedCall) {
        // Automated call - use custom intro audio if available
        if (introAudio?.audio_url) {
          twiml += `<Play>${introAudio.audio_url}</Play>`;
        } else {
          twiml += `<Say voice="man" language="en-US">${introAudio?.default_text || fallbacks.intro_automated}</Say>`;
        }
      } else {
        // Manual call-in - use manual greeting
        twiml += `<Say voice="man" language="en-US">${fallbacks.intro_manual}</Say>`;
      }

      // Ask for guest count
      if (guestCountPrompt?.audio_url) {
        twiml += `<Play>${guestCountPrompt.audio_url}</Play>`;
      } else {
        twiml += `<Say voice="man" language="en-US">${guestCountPrompt?.default_text || fallbacks.guest_count_prompt}</Say>`;
      }
      
      twiml += `<Say voice="man" language="en-US">Press a digit now.</Say>`;
      twiml += `</Gather>`;

      // If no input
      twiml += `<Say voice="man" language="en-US">We did not receive your response. Goodbye.</Say>`;
      twiml += `</Response>`;
    }

    // Log the call
    await supabase.from('meal_calls').insert({
      week_id: weekId,
      host_id: hostId,
      call_sid: callSid,
      phone_number: from,
      status: 'in-progress'
    });

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-meal-call:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="he-IL">Sorry, there was an error processing your call. Please try again later.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
