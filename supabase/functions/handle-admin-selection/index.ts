import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    const from = formData.get('From') as string;

    console.log('Admin selection:', { digits, from });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current week
    const { data: weekData } = await supabase
      .from('desperate_weeks')
      .select('*')
      .gte('week_end_date', new Date().toISOString().split('T')[0])
      .order('week_start_date', { ascending: true })
      .limit(1)
      .single();

    if (!weekData) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
        <Say voice="alice">No current week configured. Goodbye.</Say>
      </Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Get or create weekly tracking
    let { data: weeklyTracking } = await supabase
      .from('weekly_bed_tracking')
      .select('*')
      .eq('week_id', weekData.id)
      .single();

    if (!weeklyTracking) {
      const { data: settings } = await supabase.from('system_settings').select('*');
      const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
      const defaultBeds = parseInt(settingsMap.get('default_beds_needed') || '30');
      
      const { data: newTracking } = await supabase
        .from('weekly_bed_tracking')
        .insert({ week_id: weekData.id, beds_needed: defaultBeds })
        .select()
        .single();
      weeklyTracking = newTracking;
    }

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (digits === '1') {
      // Beds management
      const bedsRemaining = weeklyTracking.beds_needed - weeklyTracking.beds_confirmed;
      
      twiml += `<Say voice="alice">Bed management for this week.</Say>`;
      twiml += `<Say voice="alice">We are looking for ${weeklyTracking.beds_needed} beds.</Say>`;
      twiml += `<Say voice="alice">We have already confirmed ${weeklyTracking.beds_confirmed} beds.</Say>`;
      twiml += `<Say voice="alice">We still need ${bedsRemaining} beds.</Say>`;
      
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-admin-beds-action?week_id=${weekData.id}" method="POST" timeout="10">`;
      twiml += `<Say voice="alice">Press 1 to update the number of beds needed.</Say>`;
      twiml += `<Say voice="alice">Press 2 to send calls now.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="alice">No action taken. Goodbye.</Say>`;

    } else if (digits === '2') {
      // Meals management
      twiml += `<Say voice="alice">Meal management for this week.</Say>`;
      twiml += `<Say voice="alice">We are looking for ${weeklyTracking.meals_needed || 30} meals.</Say>`;
      twiml += `<Say voice="alice">Friday night: ${weeklyTracking.friday_night_meals_confirmed || 0} confirmed.</Say>`;
      twiml += `<Say voice="alice">Saturday day: ${weeklyTracking.saturday_day_meals_confirmed || 0} confirmed.</Say>`;
      
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-admin-meals-action?week_id=${weekData.id}" method="POST" timeout="10">`;
      twiml += `<Say voice="alice">Press 1 to update the number of meals needed.</Say>`;
      twiml += `<Say voice="alice">Press 2 to send calls now.</Say>`;
      twiml += `</Gather>`;
      twiml += `<Say voice="alice">No action taken. Goodbye.</Say>`;

    } else if (digits === '3') {
      // Check voicemails - redirect to check-voicemails-ivr function
      twiml += `<Redirect>${supabaseUrl}/functions/v1/check-voicemails-ivr?from=${encodeURIComponent(from)}</Redirect>`;

    } else if (digits === '4') {
      // Email weekly report - redirect to email-report-trigger function  
      twiml += `<Redirect>${supabaseUrl}/functions/v1/email-report-trigger?from=${encodeURIComponent(from)}&amp;week_id=${weekData.id}</Redirect>`;

    } else {
      twiml += `<Say voice="alice">Invalid selection. Goodbye.</Say>`;
    }

    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-admin-selection:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Error processing selection. Goodbye.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
