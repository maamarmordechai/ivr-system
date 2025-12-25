import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    const from = formData.get('From') as string;

    console.log('Admin menu access:', { digits, from });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin password
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*');
    
    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const adminPassword = settingsMap.get('admin_password') || '7587';

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (digits !== adminPassword) {
      twiml += `<Say voice="alice">Incorrect password. Access denied.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Password correct - get admin menu options from database
    const { data: adminMenu } = await supabase
      .from('ivr_menus_v2')
      .select('id, prompt_text')
      .eq('menu_key', 'admin')
      .is('week_id', null)
      .single();

    if (!adminMenu) {
      twiml += `<Say voice="alice">Admin menu not configured. Please contact support.</Say>`;
      twiml += `</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Get menu options
    const { data: menuOptions } = await supabase
      .from('ivr_menu_options')
      .select('*')
      .eq('menu_id', adminMenu.id)
      .order('sort_order', { ascending: true });

    // Password correct - show admin options
    twiml += `<Say voice="alice">Admin access granted.</Say>`;
    twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/handle-admin-selection?from=${encodeURIComponent(from)}" method="POST" timeout="10">`;
    twiml += `<Say voice="alice">${adminMenu.prompt_text}</Say>`;
    twiml += `</Gather>`;
    twiml += `<Say voice="alice">No selection made. Goodbye.</Say>`;
    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in handle-admin-menu:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Error accessing admin menu. Goodbye.</Say>
      </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
