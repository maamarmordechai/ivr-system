import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
    const projectUrl = SUPABASE_URL!.replace('https://', '');

    // Check if weekly availability mode is enabled
    const { data: weeklyModeSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'enable_weekly_availability_mode')
      .maybeSingle();

    const weeklyModeEnabled = weeklyModeSetting?.setting_value === 'true';

    // If weekly availability mode is enabled, redirect to that flow
    if (weeklyModeEnabled) {
      const formData = await req.formData();
      const from = formData.get("From") as string;
      const callSid = formData.get("CallSid") as string;

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${SUPABASE_URL}/functions/v1/handle-weekly-availability?step=initial&amp;from=${encodeURIComponent(from)}&amp;call_sid=${encodeURIComponent(callSid)}</Redirect>
</Response>`;

      return new Response(twiml, {
        headers: { "Content-Type": "text/xml", ...corsHeaders },
      });
    }

    // Get language setting
    const { data: langSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'tts_language')
      .maybeSingle();
    
    const language = langSetting?.setting_value || 'he-IL';

    // Get the main IVR menu
    const { data: mainMenu } = await supabase
      .from('ivr_menus_v2')
      .select('*')
      .eq('menu_key', 'main')
      .maybeSingle();

    // Get menu options (if menu exists)
    let options = [];
    if (mainMenu) {
      const { data: optionsData } = await supabase
        .from('ivr_menu_options')
        .select('*')
        .eq('menu_id', mainMenu.id)
        .eq('is_active', true)
        .order('digit', { ascending: true });
      options = optionsData || [];
    }

    // Build IVR menu with dynamic options + beds (3) + meals (4)
    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="https://${projectUrl}/functions/v1/handle-ivr-selection?menu_id=${mainMenu?.id || 'none'}" method="POST" timeout="15">`;

    // Add greeting (if menu exists) - check both prompt_text and greeting_text
    const greetingText = mainMenu?.prompt_text || mainMenu?.greeting_text;
    if (greetingText) {
      twiml += `
    <Say voice="man" language="${language}">${greetingText}</Say>
    <Pause length="1"/>`;
    } else {
      // Default greeting if no IVR menu configured
      twiml += `
    <Say voice="man" language="${language}">Welcome to the accommodation system.</Say>
    <Pause length="1"/>`;
    }

    // Add configured menu options
    for (const option of options) {
      if (option.prompt_text) {
        twiml += `
    <Say voice="man" language="${language}">${option.prompt_text}</Say>
    <Pause length="1"/>`;
      }
    }

    twiml += `
  </Gather>
  <Say voice="man" language="${language}">We didn't receive your response. Goodbye.</Say>
</Response>`;

    return new Response(twiml, {
      headers: {
        "Content-Type": "text/xml",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("Error:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Sorry, there was an error. Please try again later.</Say>
</Response>`;
    
    return new Response(errorTwiml, {
      headers: {
        "Content-Type": "text/xml",
        ...corsHeaders,
      },
    });
  }
});
