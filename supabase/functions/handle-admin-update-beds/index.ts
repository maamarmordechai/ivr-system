import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    
    const url = new URL(req.url);
    const weekId = url.searchParams.get('week_id');

    console.log('Admin update beds needed:', { digits, weekId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bedsNeeded = parseInt(digits);

    if (!bedsNeeded || bedsNeeded < 1) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
        <Say voice="man" language="he-IL">Invalid number. Please try again. Goodbye.</Say>
      </Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Update beds needed
    await supabase
      .from('weekly_bed_tracking')
      .update({ beds_needed: bedsNeeded })
      .eq('week_id', weekId);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
      <Say voice="man" language="he-IL">Beds needed updated to ${bedsNeeded}.</Say>
      <Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-admin-send-calls?week_id=${weekId}&amp;type=beds" method="POST" timeout="10">
        <Say voice="man" language="he-IL">Press 1 to send calls now. Press 2 to skip.</Say>
      </Gather>
      <Say voice="man" language="he-IL">Thank you. Goodbye.</Say>
    </Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-admin-update-beds:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="he-IL">Error updating beds. Goodbye.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
