import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    
    const url = new URL(req.url);
    const weekId = url.searchParams.get('week_id');
    const apartmentId = url.searchParams.get('apartment_id');

    console.log('Partial beds:', { digits, weekId, apartmentId });

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

    const bedCount = parseInt(digits);

    if (isNaN(bedCount) || bedCount <= 0) {
      twiml += `<Say voice="man" language="he-IL">Sorry, that's not a valid number.</Say>`;
      twiml += `<Redirect>${supabaseUrl}/functions/v1/open-call-system</Redirect>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Increment beds confirmed
    await supabase.rpc('increment_beds_confirmed', {
      p_week_id: weekId,
      p_beds: bedCount
    });

    // Get apartment and update
    const { data: apartment } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (apartment) {
      // Create bed confirmation record
      await supabase
        .from('bed_confirmations')
        .insert({
          week_id: weekId,
          apartment_id: apartmentId,
          beds_confirmed: bedCount,
          confirmed_via: 'phone_call'
        });

      await supabase
        .from('apartments')
        .update({
          last_helped_date: new Date().toISOString().split('T')[0],
          times_helped: (apartment.times_helped || 0) + 1
        })
        .eq('id', apartmentId);
    }

    twiml += playAudio('thank_you_message');
    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-partial-beds:', error);
    
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
