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
    const previousBeds = parseInt(url.searchParams.get('previous_beds') || '0');

    console.log('Update beds:', { digits, weekId, apartmentId, previousBeds });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bedCount = parseInt(digits);
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (isNaN(bedCount) || bedCount < 0) {
      twiml += `<Say voice="man" language="en-US">Invalid number. Please call back and try again.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    if (bedCount === 0) {
      // Cancel - void previous confirmation
      if (previousBeds > 0) {
        await supabase
          .from('bed_confirmations')
          .update({
            voided: true,
            voided_at: new Date().toISOString(),
            voided_by: 'system',
            void_reason: 'Host cancelled via phone call'
          })
          .eq('week_id', weekId)
          .eq('apartment_id', apartmentId)
          .eq('voided', false);

        await supabase.rpc('increment_beds_confirmed', {
          p_week_id: weekId,
          p_beds: -previousBeds
        });
      }
      twiml += `<Say voice="man" language="en-US">Your confirmation has been cancelled. Thank you for letting us know.</Say>`;
    } else {
      // Update confirmation
      if (previousBeds > 0) {
        // Void old confirmation
        await supabase
          .from('bed_confirmations')
          .update({
            voided: true,
            voided_at: new Date().toISOString(),
            voided_by: 'system',
            void_reason: 'Updated by host via phone call'
          })
          .eq('week_id', weekId)
          .eq('apartment_id', apartmentId)
          .eq('voided', false);
      }

      // Create new confirmation
      await supabase
        .from('bed_confirmations')
        .insert({
          week_id: weekId,
          apartment_id: apartmentId,
          beds_confirmed: bedCount,
          confirmed_via: previousBeds > 0 ? 'phone_call_update' : 'phone_call'
        });

      // Update weekly tracking
      const bedDifference = bedCount - previousBeds;
      await supabase.rpc('increment_beds_confirmed', {
        p_week_id: weekId,
        p_beds: bedDifference
      });

      // Update apartment stats
      const { data: apartment } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', apartmentId)
        .single();

      if (apartment) {
        await supabase
          .from('apartments')
          .update({
            last_helped_date: new Date().toISOString().split('T')[0],
            times_helped: (apartment.times_helped || 0) + 1
          })
          .eq('id', apartmentId);
      }

      if (previousBeds > 0) {
        twiml += `<Say voice="man" language="en-US">Your confirmation has been updated from ${previousBeds} bed${previousBeds > 1 ? 's' : ''} to ${bedCount} bed${bedCount > 1 ? 's' : ''}. Thank you.</Say>`;
      } else {
        twiml += `<Say voice="man" language="en-US">Thank you for confirming ${bedCount} bed${bedCount > 1 ? 's' : ''}. We appreciate your help.</Say>`;
      }
    }

    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-host-update-beds:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="en-US">Thank you. Goodbye.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
