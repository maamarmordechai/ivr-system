import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    
    // Get apartment_id from URL if provided (automated call)
    const apartmentIdParam = url.searchParams.get('apartment_id');

    console.log('Open call system:', { from, callSid, apartmentIdParam });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get language setting
    const { data: langSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'tts_language')
      .maybeSingle();
    
    const language = langSetting?.setting_value || 'he-IL';

    // Get audio settings (optional - use fallback if not exists)
    const { data: audioSettings } = await supabase
      .from('bed_audio_settings')
      .select('*')
      .eq('is_active', true);
    
    const audioMap = new Map(audioSettings?.map(a => [a.audio_key, a]) || []);
    
    const playAudio = (key: string, replacements?: Record<string, string>, fallback?: string) => {
      const audio = audioMap.get(key);
      
      // If audio setting exists, use it
      if (audio) {
        if (audio.audio_url) {
          return `<Play>${audio.audio_url}</Play>`;
        } else if (audio.default_text) {
          let text = audio.default_text;
          if (replacements) {
            for (const [k, value] of Object.entries(replacements)) {
              text = text.replace(`{${k}}`, value);
            }
          }
          return `<Say voice="man" language="${language}">${text}</Say>`;
        }
      }
      
      // Use fallback if provided
      if (fallback) {
        let text = fallback;
        if (replacements) {
          for (const [k, value] of Object.entries(replacements)) {
            text = text.replace(`{${k}}`, value);
          }
        }
        return `<Say voice="man" language="${language}">${text}</Say>`;
      }
      
      return '';
    };

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Check if caller is registered apartment
    let apartment = null;
    
    if (apartmentIdParam) {
      // Automated call - use provided apartment_id
      const { data: aptData } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', apartmentIdParam)
        .single();
      apartment = aptData;
    } else {
      // Manual/direct call - lookup by phone number
      // Try exact match first
      const { data: exactMatch } = await supabase
        .from('apartments')
        .select('*')
        .eq('phone_number', from)
        .maybeSingle();
      
      if (exactMatch) {
        apartment = exactMatch;
      } else {
        // Try matching just the digits (remove +, -, spaces, parentheses)
        const digitsOnly = from.replace(/\D/g, '');
        const { data: fuzzyMatches } = await supabase
          .from('apartments')
          .select('*');
        
        // Find match by comparing digits only
        apartment = fuzzyMatches?.find(apt => {
          const aptDigits = apt.phone_number?.replace(/\D/g, '');
          return aptDigits === digitsOnly || 
               aptDigits === digitsOnly.slice(-10) || // Last 10 digits
               digitsOnly === aptDigits?.slice(-10);
        });
      }
    }

    // Get current week
    const today = new Date().toISOString().split('T')[0];
    const { data: weekData } = await supabase
      .from('desperate_weeks')
      .select('*')
      .gte('week_end_date', today)
      .order('week_start_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!weekData) {
      twiml += `<Say voice="man" language="${language}">Sorry, no current week configured. Please contact the administrator.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Get weekly tracking
    let { data: weeklyTracking } = await supabase
      .from('weekly_bed_tracking')
      .select('*')
      .eq('week_id', weekData.id)
      .maybeSingle();

    if (!weeklyTracking) {
      // Create default tracking
      const { data: newTracking } = await supabase
        .from('weekly_bed_tracking')
        .insert({ week_id: weekData.id, beds_needed: 30 })
        .select()
        .single();
      weeklyTracking = newTracking;
    }

    const bedsRemaining = weeklyTracking.beds_needed - weeklyTracking.beds_confirmed;

    if (apartment) {
      // Check if they already confirmed beds this week (non-voided)
      const { data: existingConfirmation } = await supabase
        .from('bed_confirmations')
        .select('*')
        .eq('week_id', weekData.id)
        .eq('apartment_id', apartment.id)
        .eq('voided', false)
        .order('confirmed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConfirmation) {
        // ALREADY CONFIRMED - Offer to update
        twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-host-response?week_id=${weekData.id}&amp;apartment_id=${apartment.id}&amp;from=${encodeURIComponent(from)}&amp;update_mode=true&amp;existing_beds=${existingConfirmation.beds_confirmed}" method="POST" timeout="15">`;
        twiml += playAudio('existing_host_greeting', {}, 'Hello, welcome back.');
        twiml += `<Say voice="man" language="${language}">You already confirmed ${existingConfirmation.beds_confirmed} beds for this week.</Say>`;
        twiml += `<Say voice="man" language="${language}">Press 1 to update your availability. Press 0 if everything is correct.</Say>`;
        twiml += `</Gather>`;
        twiml += `<Say voice="man" language="${language}">We did not receive your response. Goodbye.</Say>`;
      } else {
        // NEW CONFIRMATION - Normal flow
        twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-host-response?week_id=${weekData.id}&amp;apartment_id=${apartment.id}&amp;from=${encodeURIComponent(from)}" method="POST" timeout="15">`;
        twiml += playAudio('existing_host_greeting', {}, 'Hello, welcome back.');
        twiml += playAudio('existing_host_beds_info', 
          { bed_count: apartment.number_of_beds.toString() }, 
          'Our records show you have {bed_count} beds available.');
        twiml += playAudio('beds_needed_prompt', 
          { beds_remaining: bedsRemaining.toString() }, 
          'We are looking for {beds_remaining} beds this week.');
        twiml += playAudio('existing_host_prompt', {}, 
          'Are you available to provide beds this week? Press 1 for yes, all beds available. Press 2 for no, not available. Press 3 for only some beds available. Press 9 to call me back on Friday.');
        twiml += `</Gather>`;
        twiml += `<Say voice="man" language="${language}">We did not receive your response. Goodbye.</Say>`;
      }
    } else {
      // NEW CALLER - Register and ask for capacity
      twiml += `<Gather numDigits="2" action="${supabaseUrl}/functions/v1/handle-new-host?week_id=${weekData.id}&amp;from=${encodeURIComponent(from)}" method="POST" timeout="15">`;
      twiml += playAudio('welcome_message', {}, 'Welcome to the accommodation system.');
      twiml += playAudio('beds_needed_prompt', 
        { beds_remaining: bedsRemaining.toString() }, 
        'We are looking for {beds_remaining} beds this week.');
      twiml += playAudio('new_host_prompt', {}, 'How many beds can you provide? Enter a number now.');
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="${language}">We did not receive your response. Goodbye.</Say>`;
    }

    twiml += `</Response>`;

    // Log call
    await supabase.from('incoming_calls').insert({
      phone_number: from,
      call_sid: callSid,
      week_id: weekData.id,
      apartment_id: apartment?.id || null,
      status: 'in-progress'
    });

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in open-call-system:', error);
    
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
