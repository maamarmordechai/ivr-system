import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const digit = formData.get("Digits")?.toString() || "";
    const from = formData.get("From")?.toString() || "";
    const menuId = new URL(req.url).searchParams.get("menu_id") || "";

    console.log("IVR selection - Digit:", digit, "From:", from, "Menu ID:", menuId);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
    const projectUrl = SUPABASE_URL!.replace('https://', '');

    // Look up the menu option for this digit
    const { data: option, error } = await supabase
      .from('ivr_menu_options')
      .select(`
        *,
        voicemail_boxes (id, box_name, box_number, email_notifications, priority_level)
      `)
      .eq('menu_id', menuId)
      .eq('digit', digit)
      .single();

    if (error || !option) {
      console.log("No menu option found for digit:", digit);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Sorry, that's not a valid option. Please try again.</Say>
  <Redirect method="POST">https://${projectUrl}/functions/v1/incoming-call</Redirect>
</Response>`;
      return new Response(twiml, {
        headers: { "Content-Type": "application/xml", ...corsHeaders }
      });
    }

    // Route based on action_type
    switch (option.action_type) {
      case 'voicemail': {
        if (!option.voicemail_box_id) {
          console.error("Voicemail box ID missing for option:", option.id);
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, the voicemail system is not configured. Please try another option. Goodbye.</Say>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }
        
        const callSid = formData.get("CallSid")?.toString() || "";
        const fromPhone = from.replace('+', '');
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Please leave a message after the beep.</Say>
  <Pause length="1"/>
  <Record maxLength="120" playBeep="true" action="https://${projectUrl}/functions/v1/handle-voicemail-complete?box_id=${option.voicemail_box_id}" method="POST" recordingStatusCallback="https://${projectUrl}/functions/v1/handle-voicemail?box_id=${option.voicemail_box_id}&amp;call_sid=${callSid}&amp;from=${fromPhone}" recordingStatusCallbackMethod="POST"/>
</Response>`;
        
        console.log("Voicemail callback for:", from);
        
        return new Response(twiml, {
          headers: { "Content-Type": "application/xml", ...corsHeaders }
        });
      }

      case 'custom_function': {
        // Route based on function_name
        if (option.function_name === 'beds') {
          // Beds management - redirect to open-call-system
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">https://${projectUrl}/functions/v1/open-call-system</Redirect>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }

        if (option.function_name === 'meals') {
          // Get current week for meal hosting
          const today = new Date().toISOString().split('T')[0];
          const { data: weekData } = await supabase
            .from('desperate_weeks')
            .select('*')
            .gte('week_end_date', today)
            .order('week_start_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!weekData) {
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">Sorry, no current week configured. Goodbye.</Say>
</Response>`;
            return new Response(twiml, {
              headers: { "Content-Type": "application/xml", ...corsHeaders }
            });
          }

          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">https://${projectUrl}/functions/v1/handle-meal-call?week_id=${weekData.id}&amp;from=${encodeURIComponent(from)}</Redirect>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }

        if (option.function_name === 'register_host') {
          // Host registration - redirect to register-host
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">https://${projectUrl}/functions/v1/register-host</Redirect>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }

        if (option.function_name === 'register_meal_host') {
          // Meal host registration - redirect to register-meal-host
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">https://${projectUrl}/functions/v1/register-meal-host</Redirect>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }

        if (option.function_name === 'admin') {
          // Admin menu - ask for password
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="4" action="https://${projectUrl}/functions/v1/handle-admin-menu" method="POST" timeout="10">
    <Say voice="alice">Please enter the 4 digit admin password.</Say>
  </Gather>
  <Say voice="alice">No password entered. Goodbye.</Say>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }

        // Route to specific Edge Function
        if (option.function_name === 'check_host_availability') {
          // This is the bed availability check - use existing handle-bed-response
          const { data: weekData } = await supabase.rpc('get_current_week');
          const { data: apartment } = await supabase
            .from('apartments')
            .select('*')
            .eq('phone_number', from)
            .single();

          if (!apartment) {
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we couldn't find your apartment record. Please contact the administrator. Goodbye.</Say>
</Response>`;
            return new Response(twiml, {
              headers: { "Content-Type": "application/xml", ...corsHeaders }
            });
          }

          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="https://${projectUrl}/functions/v1/handle-bed-response?from=${encodeURIComponent(from)}" method="POST" timeout="10" finishOnKey="#">
    <Say voice="man" language="he-IL">Do you have beds available for guests this week?</Say>
    <Pause length="1"/>
    <Say voice="man" language="he-IL">Press 1 if yes, you have beds available.</Say>
    <Pause length="1"/>
    <Say voice="man" language="he-IL">Press 2 if no, you don't have beds available.</Say>
    <Pause length="1"/>
    <Say voice="alice">Press 3 if you have some beds available, and we'll ask you how many.</Say>
    <Pause length="1"/>
    <Say voice="alice">Press 9 if you want us to call you back on Friday.</Say>
  </Gather>
  <Say voice="alice">We didn't receive your response. Goodbye.</Say>
</Response>`;
          return new Response(twiml, {
            headers: { "Content-Type": "application/xml", ...corsHeaders }
          });
        }
        
        // Default for unknown functions
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This feature is not yet available. Goodbye.</Say>
</Response>`;
        return new Response(twiml, {
          headers: { "Content-Type": "application/xml", ...corsHeaders }
        });
      }

      case 'transfer': {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Transferring your call now.</Say>
  <Dial>${option.transfer_number}</Dial>
  <Say voice="alice">The transfer failed. Goodbye.</Say>
</Response>`;
        return new Response(twiml, {
          headers: { "Content-Type": "application/xml", ...corsHeaders }
        });
      }

      case 'submenu': {
        // Fetch submenu and generate new Gather
        const { data: submenu } = await supabase
          .from('ivr_menus_v2')
          .select('*')
          .eq('id', option.submenu_id)
          .single();

        if (!submenu) {
          throw new Error("Submenu not found");
        }

        const { data: submenuOptions } = await supabase
          .from('ivr_menu_options')
          .select('*')
          .eq('menu_id', submenu.id)
          .order('sort_order');

        let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${submenu.voice_name || 'alice'}">${submenu.prompt_text}</Say>
  <Gather numDigits="${submenu.max_digits || 1}" action="https://${projectUrl}/functions/v1/handle-ivr-selection?menu_id=${submenu.id}" method="POST" timeout="${submenu.timeout_seconds || 10}">`;
        
        submenuOptions?.forEach(opt => {
          twiml += `
    <Say voice="${submenu.voice_name || 'alice'}">${opt.option_name}</Say>`;
        });
        
        twiml += `
  </Gather>
  <Say voice="alice">We didn't receive your selection. Goodbye.</Say>
</Response>`;
        
        return new Response(twiml, {
          headers: { "Content-Type": "application/xml", ...corsHeaders }
        });
      }

      case 'hangup':
      default: {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Goodbye.</Say>
</Response>`;
        return new Response(twiml, {
          headers: { "Content-Type": "application/xml", ...corsHeaders }
        });
      }
    }
  } catch (error) {
    console.error("Error handling IVR selection:", error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, an error occurred. Please try again later. Goodbye.</Say>
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml", ...corsHeaders }
    });
  }
});
