import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    
    const url = new URL(req.url);
    const apartmentId = url.searchParams.get('apartment_id');

    console.log('Weekly calls preference:', { digits, apartmentId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const wantsWeeklyCalls = digits === '1';

    await supabase
      .from('apartments')
      .update({ wants_weekly_calls: wantsWeeklyCalls })
      .eq('id', apartmentId);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
      <Say voice="man" language="he-IL">${wantsWeeklyCalls ? 'You will receive weekly calls.' : 'You will not receive weekly calls.'}</Say>
      <Say voice="man" language="he-IL">Thank you for registering. We will contact you soon. Goodbye.</Say>
    </Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-weekly-calls-preference:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="he-IL">Thank you. Goodbye.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
