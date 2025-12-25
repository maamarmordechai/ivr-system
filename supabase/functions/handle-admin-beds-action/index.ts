import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    
    const url = new URL(req.url);
    const weekId = url.searchParams.get('week_id');

    console.log('Admin beds action:', { digits, weekId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (digits === '1') {
      // Update beds needed
      twiml += `<Gather numDigits="2" action="${supabaseUrl}/functions/v1/handle-admin-update-beds?week_id=${weekId}" method="POST" timeout="10">`;
      twiml += `<Say voice="man" language="he-IL">Enter the number of beds needed this week.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="he-IL">No number entered. Goodbye.</Say>`;

    } else if (digits === '2') {
      // Send calls now
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-admin-send-calls?week_id=${weekId}&amp;type=beds" method="POST" timeout="10">`;
      twiml += `<Say voice="man" language="he-IL">Press 1 to confirm sending calls to all hosts now.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="man" language="he-IL">Calls not sent. Goodbye.</Say>`;
    }

    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-admin-beds-action:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="man" language="he-IL">Error. Goodbye.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
