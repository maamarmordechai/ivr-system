import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    // Main IVR step router
    const step = url.searchParams.get("step") || "main_menu";
    const apartmentId = url.searchParams.get("apartment_id");
    const contactName = url.searchParams.get("contact_name"); // Name from Excel upload
    

    let formData = null;
    let digits = "";
    let from = "";
    let callSid = "";
    try {
      formData = await req.formData();
    } catch {}
    // Prefer formData if available, fallback to URL params
    digits = (formData && formData.get("Digits")) ? String(formData.get("Digits")) : (url.searchParams.get("Digits") || "");
    from = (formData && formData.get("From")) ? String(formData.get("From")) : (url.searchParams.get("from") || url.searchParams.get("From") || "");
    callSid = (formData && formData.get("CallSid")) ? String(formData.get("CallSid")) : (url.searchParams.get("call_sid") || url.searchParams.get("CallSid") || "");

    console.log("Weekly availability check:", { step, digits, from, apartmentId, method: req.method });
    if (formData) {
      try {
        for (const entry of formData.entries()) {
          console.log("formData entry:", entry[0], entry[1]);
        }
      } catch (e) {
        console.log("formData logging error", e);
      }
    }

    // Get call audio configuration (new system - takes priority)
    // Try to get config - if table doesn't exist or no config, just continue without it
    let callAudioConfig = null;
    try {
      const { data, error } = await supabase
        .from("call_audio_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.log("Error loading call_audio_config:", error.message);
      } else if (data) {
        callAudioConfig = data;
        console.log("Loaded call_audio_config:", {
          id: data.id,
          hasGreetingAudio: !!data.greeting_audio_url,
          useGreetingAudioNew: data.use_greeting_audio,
          useGreetingAudioOld: data.greeting_use_audio,
          hasAcceptAudio: !!data.accept_confirmation_audio_url,
          useAcceptNew: data.use_accept_confirmation_audio
        });
      } else {
        console.log("No call_audio_config found");
      }
    } catch (e) {
      console.log("call_audio_config not available, using defaults:", e);
    }

    // Helper to get audio from new config
    const getConfigAudio = (key: string): { audioUrl: string | null, text: string } => {
      if (!callAudioConfig) {
        console.log(`getConfigAudio(${key}): No config loaded`);
        return { audioUrl: null, text: '' };
      }
      
      // Get the audio URL
      const audioUrl = callAudioConfig[`${key}_audio_url`];
      
      // Check both column naming patterns for the use_audio flag
      const useAudioOld = callAudioConfig[`${key}_use_audio`];   // OLD: greeting_use_audio
      const useAudioNew = callAudioConfig[`use_${key}_audio`];   // NEW: use_greeting_audio
      const useAudio = useAudioNew === true || useAudioOld === true;
      
      // Get the text fallback
      const text = callAudioConfig[`${key}_text`] || '';
      
      console.log(`getConfigAudio(${key}): audioUrl=${audioUrl ? 'YES' : 'NO'}, useAudio=${useAudio}, useAudioNew=${useAudioNew}, useAudioOld=${useAudioOld}`);
      
      return { 
        audioUrl: useAudio && audioUrl ? audioUrl : null, 
        text 
      };
    };

    // Get voicemail recordings for audio prompts (legacy fallback)
    const { data: promptMappings } = await supabase
      .from("voicemail_audio_prompts")
      .select(`
        prompt_key,
        audio_url,
        voicemails (
          recording_url
        )
      `)
      .eq("is_active", true);

    const audioMap = new Map();
    if (promptMappings) {
      promptMappings.forEach((mapping: any) => {
        // Prefer audio_url if provided, otherwise use voicemail recording
        const audioUrl = mapping.audio_url || mapping.voicemails?.recording_url;
        if (audioUrl) {
          audioMap.set(mapping.prompt_key, audioUrl);
        }
      });
    }

    // Get IVR Flow Builder audio (takes priority over legacy voicemail prompts)
    const { data: ivrFlowSteps } = await supabase
      .from("ivr_flow_steps")
      .select(`
        step_key,
        audio_url,
        prompt_text,
        ivr_flows!inner (
          is_active,
          is_default
        )
      `)
      .eq("ivr_flows.is_active", true);

    // IVR Flow step audio (overrides legacy if exists)
    if (ivrFlowSteps) {
      ivrFlowSteps.forEach((step: any) => {
        if (step.audio_url) {
          audioMap.set(step.step_key, step.audio_url);
        }
      });
    }

    // Get IVR Flow Action audio (response audio after button press)
    const { data: ivrFlowActions } = await supabase
      .from("ivr_flow_actions")
      .select(`
        id,
        digit,
        action_audio_url,
        action_audio_text,
        ivr_flow_steps!inner (
          step_key,
          ivr_flows!inner (
            is_active
          )
        )
      `)
      .not("action_audio_url", "is", null);

    // Create action audio map: step_key_digit -> audio_url
    const actionAudioMap = new Map();
    if (ivrFlowActions) {
      ivrFlowActions.forEach((action: any) => {
        if (action.action_audio_url && action.ivr_flow_steps?.step_key) {
          const key = `${action.ivr_flow_steps.step_key}_${action.digit}`;
          actionAudioMap.set(key, action.action_audio_url);
        }
      });
    }

    // Helper function to play audio or TTS
    const playOrSay = (audioUrl: string | null, ttsText: string, voice: string = "alice") => {
      if (audioUrl) {
        return `<Play>${audioUrl}</Play>`;
      }
      return `<Say voice="${voice}">${ttsText}</Say>`;
    };

    // Helper function to get action response audio
    const getActionAudio = (stepKey: string, digit: string): string | null => {
      return actionAudioMap.get(`${stepKey}_${digit}`) || null;
    };

    // Get current week (find week that contains today)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const { data: currentWeek } = await supabase
      .from('desperate_weeks')
      .select('id, week_start_date, week_end_date')
      .lte('week_start_date', todayStr)
      .gte('week_end_date', todayStr)
      .limit(1)
      .maybeSingle();

    let weekId = currentWeek?.id;
    
    // If no current week found, auto-create one for this week
    if (!weekId) {
      console.log('No current week found, creating one...');
      
      // Calculate this week's Sunday (start) and next Saturday (end)
      const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      const daysUntilSunday = dayOfWeek === 0 ? 0 : -dayOfWeek; // If Sunday, use today; else go back to Sunday
      const thisSunday = new Date(today);
      thisSunday.setDate(today.getDate() + daysUntilSunday);
      
      const nextSaturday = new Date(thisSunday);
      nextSaturday.setDate(thisSunday.getDate() + 6); // Sunday + 6 days = Saturday
      
      const weekStartStr = thisSunday.toISOString().split('T')[0];
      const weekEndStr = nextSaturday.toISOString().split('T')[0];
      
      console.log('Creating week:', weekStartStr, 'to', weekEndStr);
      
      const { data: newWeek, error: createError } = await supabase
        .from('desperate_weeks')
        .insert({
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          is_desperate: false,
          expected_guests: 30
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('Error creating week:', createError);
        // Try to get the most recent week as fallback
        const { data: latestWeek } = await supabase
          .from('desperate_weeks')
          .select('id')
          .order('week_start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        weekId = latestWeek?.id;
      } else {
        weekId = newWeek?.id;
        console.log('Created new week with ID:', weekId);
      }
    }

    // Check if we still need beds (for sequential calling system)
    const { data: bedTracking } = await supabase
      .from('weekly_bed_tracking')
      .select('beds_needed, beds_confirmed')
      .eq('week_id', weekId)
      .maybeSingle();
    
    const bedsNeeded = bedTracking?.beds_needed || 30;
    const bedsConfirmed = bedTracking?.beds_confirmed || 0;
    const bedsStillNeeded = bedsNeeded - bedsConfirmed;

    // Main menu logic - also handle "initial" step for outbound calls
    if (step === "main_menu" || step === "initial") {
      // Always show full menu - bed check happens when they press 1
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      
      // Use new config system first, fallback to legacy
      const greetingConfig = getConfigAudio('greeting');
      const menuConfig = getConfigAudio('menu_options');
      const mainMenuUrl = greetingConfig.audioUrl || audioMap.get("main_menu");
      
      twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=main_menu_select" method="POST" timeout="15">`;
      
      // Play greeting first
      if (greetingConfig.audioUrl) {
        twiml += `<Play>${greetingConfig.audioUrl}</Play>`;
      } else if (mainMenuUrl) {
        twiml += `<Play>${mainMenuUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">${greetingConfig.text || "Welcome to the Machnisei Orchim phone line."}</Say>`;
      }
      
      // Then play menu options if configured separately
      if (menuConfig.audioUrl) {
        twiml += `<Play>${menuConfig.audioUrl}</Play>`;
      } else if (!mainMenuUrl && !greetingConfig.audioUrl) {
        twiml += `<Say voice="alice">${menuConfig.text || "To report that you can host guests this Shabbos, press 1. To register as a host and receive calls, press 2. To reach the office, press 0. For admin options, press 8."}</Say>`;
      }
      twiml += `</Gather>`;
      // Repeat the menu instead of hanging up if no response
      twiml += `<Say voice="alice">We did not receive your response. Let me repeat.</Say>`;
      twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=main_menu</Redirect>`;
      twiml += `</Response>`;
      return new Response(twiml, {
        headers: { "Content-Type": "text/xml", ...corsHeaders },
      });
    }

    // OUTBOUND AUTOMATED CALL - Weekly availability check
    if (step === "outbound_weekly_check") {
      // Build the outbound call TwiML (bed check happens when they press 1)
      const encodedFrom = encodeURIComponent(from);
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      
      // Use configured audio for greeting and menu options
      const greetingConfig = getConfigAudio('greeting');
      const menuConfig = getConfigAudio('menu_options');
      
      twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=process_response&amp;apartment_id=${apartmentId || ''}&amp;From=${encodedFrom}" method="POST" timeout="15">`;
      
      // Play greeting: "Hello, this is the Machnisei Orchim hospitality system."
      if (greetingConfig.audioUrl) {
        twiml += `<Play>${greetingConfig.audioUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">${greetingConfig.text}</Say>`;
      }
      
      // Play menu options: "Press 1 to accept guests. Press 2 to decline. Press 3 to request a callback on Friday."
      if (menuConfig.audioUrl) {
        twiml += `<Play>${menuConfig.audioUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">${menuConfig.text}</Say>`;
      }
      
      twiml += `</Gather>`;
      
      // Repeat if no response
      twiml += `<Say voice="alice">We did not receive your response. Let me repeat.</Say>`;
      twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=outbound_weekly_check&amp;apartment_id=${apartmentId || ''}&amp;From=${encodedFrom}</Redirect>`;
      twiml += `</Response>`;
      
      return new Response(twiml, {
        headers: { "Content-Type": "text/xml", ...corsHeaders },
      });
    }

    // Main menu selection - DYNAMIC routing with sub-menu support
    if (step === "main_menu_select" || step.endsWith("_menu_select")) {
      const digit = digits || url.searchParams.get("Digits") || "";
      const currentMenu = step === "main_menu_select" ? "main_menu" : step.replace("_menu_select", "");
      
      // Look up what function this digit should route to
      const { data: menuOption } = await supabase
        .from('ivr_menu_options')
        .select('function_name, audio_url')
        .eq('menu_name', currentMenu)
        .eq('digit_press', digit)
        .eq('is_enabled', true)
        .maybeSingle();
      
      let nextStep = "";
      
      if (menuOption) {
        // Handle call forwarding
        if (menuOption.function_name === 'forward_call') {
          if (!menuOption.audio_url || menuOption.audio_url.trim() === '') {
            const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
<Say voice="alice">Call forwarding is not configured. Please contact the administrator.</Say>
<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=${currentMenu}_display</Redirect>
</Response>`;
            return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
          }
          
          const phoneNumber = menuOption.audio_url;
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>
<Say voice="alice">Please wait while we connect your call.</Say>
<Dial callerId="${process.env.TWILIO_PHONE_NUMBER || '+18445277900'}">${phoneNumber}</Dial>
<Say voice="alice">The call could not be completed. Goodbye.</Say>
<Hangup/>
</Response>`;
          return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
        }
        
        // Map function_name to actual step
        const functionMap: Record<string, string> = {
          'accept_guests': 'host_shabbos',
          'register_host': 'register_host',
          'voicemail': 'leave_message',
          'admin': 'admin_options'
        };
        
        // If function_name matches a known function, use it
        // Otherwise, treat it as a sub-menu name
        if (functionMap[menuOption.function_name]) {
          nextStep = functionMap[menuOption.function_name];
        } else {
          // It's a sub-menu - redirect to that menu
          nextStep = `${menuOption.function_name}_display`;
        }
        
        console.log(`Menu: ${currentMenu}, Digit ${digit} → function ${menuOption.function_name} → step ${nextStep}`);
      }
      
      if (nextStep) {
        const encodedFrom = encodeURIComponent(from);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>\n<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=${nextStep}&amp;From=${encodedFrom}</Redirect>\n</Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      } else {
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        twiml += `<Say voice="alice">Oops, that is not a valid option.</Say>`;
        twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=${currentMenu}_display</Redirect>`;
        twiml += `</Response>`;
        return new Response(twiml, {
          headers: { "Content-Type": "text/xml", ...corsHeaders },
        });
      }
    }

    // Dynamic menu display for any menu (including sub-menus)
    if (step.endsWith("_display")) {
      const menuName = step.replace("_display", "");
      
      // Fetch menu greeting audio if exists
      const { data: greetingData } = await supabase
        .from('ivr_menu_greetings')
        .select('audio_url')
        .eq('menu_name', menuName)
        .maybeSingle();
      
      // Fetch menu options
      const { data: menuOptions } = await supabase
        .from('ivr_menu_options')
        .select('digit_press, audio_text, function_name')
        .eq('menu_name', menuName)
        .eq('is_enabled', true)
        .order('display_order');
      
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      
      if (menuOptions && menuOptions.length > 0) {
        twiml += `<Gather action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=${menuName}_menu_select" method="POST" numDigits="1" timeout="10">`;
        
        // Play greeting audio if configured
        if (greetingData && greetingData.audio_url) {
          twiml += `<Play>${greetingData.audio_url}</Play>`;
        }
        
        // Read out menu options
        menuOptions.forEach((option: any) => {
          if (option.audio_text) {
            twiml += `<Say voice="alice">${option.audio_text}</Say>`;
          }
        });
        
        twiml += `</Gather>`;
        twiml += `<Say voice="alice">I did not receive your selection.</Say>`;
        twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=${menuName}_display</Redirect>`;
      } else {
        twiml += `<Say voice="alice">This menu has no options configured.</Say>`;
        twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=main_menu</Redirect>`;
      }
      
      twiml += `</Response>`;
      
      return new Response(twiml, {
        headers: { "Content-Type": "text/xml", ...corsHeaders },
      });
    }

    // Host for this Shabbos
    if (step === "host_shabbos") {
      // Normalize phone number
      const normalizedFrom = from?.replace(/[\s\-\(\)\+]/g, '');
      let apartment = null;
      if (normalizedFrom) {
        const { data: exactMatch } = await supabase
          .from("apartments")
          .select("id, person_name, number_of_beds")
          .eq("phone_number", from)
          .maybeSingle();
        apartment = exactMatch;
        if (!apartment) {
          const { data: allApartments } = await supabase
            .from("apartments")
            .select("id, person_name, number_of_beds, phone_number")
            .not("phone_number", "is", null);
          if (allApartments) {
            apartment = allApartments.find(apt => apt.phone_number?.replace(/[\s\-\(\)\+]/g, '') === normalizedFrom);
          }
        }
      }
      // Check if more beds are needed
      let bedsNeeded = 1;
      const { data: weekStats } = await supabase.rpc('get_beds_needed', { p_week_id: weekId });
      if (weekStats && typeof weekStats.beds_needed === 'number') bedsNeeded = weekStats.beds_needed;
      if (bedsNeeded <= 0) {
        // Use new config for no beds needed message
        const noBedConfig = getConfigAudio('no_beds_needed');
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        const allSetUrl = noBedConfig.audioUrl || audioMap.get("all_set");
        if (noBedConfig.audioUrl) {
          twiml += `<Play>${noBedConfig.audioUrl}</Play>`;
        } else if (allSetUrl) {
          twiml += `<Play>${allSetUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${noBedConfig.text || "Thank you for calling, everyone is already set for this week. Have a good Shabbos."}</Say>`;
        }
        twiml += `<Hangup/></Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      }
      const encodedFrom = encodeURIComponent(from);
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      if (apartment) {
        // Registered - use new config for recognized host
        const recognizedConfig = getConfigAudio('recognized_host');
        const beds = apartment.number_of_beds || 0;
        const promptUrl = recognizedConfig.audioUrl || audioMap.get("host_confirm") || audioMap.get("host_recognized");
        twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=host_confirm&amp;apartment_id=${apartment.id}&amp;From=${encodedFrom}" method="POST" timeout="15">`;
        if (recognizedConfig.audioUrl) {
          twiml += `<Play>${recognizedConfig.audioUrl}</Play>`;
          // After playing recognized audio, say the name and bed info
          twiml += `<Say voice="alice">${apartment.person_name}, and you have ${beds} beds. To confirm, press 1. To update, press 2.</Say>`;
        } else if (promptUrl) {
          twiml += `<Play>${promptUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${recognizedConfig.text || "The system recognizes you as"} ${apartment.person_name}, and you have ${beds} beds. To confirm, press 1. To update, press 2.</Say>`;
        }
        twiml += `</Gather>`;
      } else {
        // Not registered - use new config for unrecognized host
        const unrecognizedConfig = getConfigAudio('unrecognized_host');
        const bedsQuestionConfig = getConfigAudio('beds_question');
        const promptUrl = unrecognizedConfig.audioUrl || audioMap.get("host_unreg_beds") || audioMap.get("host_unrecognized");
        twiml += `<Gather finishOnKey="#" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=host_unreg_beds&amp;From=${encodedFrom}" method="POST" timeout="15">`;
        if (unrecognizedConfig.audioUrl) {
          twiml += `<Play>${unrecognizedConfig.audioUrl}</Play>`;
          // After unrecognized message, ask for beds
          if (bedsQuestionConfig.audioUrl) {
            twiml += `<Play>${bedsQuestionConfig.audioUrl}</Play>`;
          } else {
            twiml += `<Say voice="alice">${bedsQuestionConfig.text || "How many beds can you offer this Shabbos? Enter the number and press pound."}</Say>`;
          }
        } else if (promptUrl) {
          twiml += `<Play>${promptUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${unrecognizedConfig.text || "The system does not recognize your number."} ${bedsQuestionConfig.text || "How many beds can you offer this Shabbos? Enter the number and press pound."}</Say>`;
        }
        twiml += `</Gather>`;
      }
      twiml += `</Response>`;
      console.log("TwiML for host_shabbos step:\n" + twiml);
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Host confirm (registered)
    if (step === "host_confirm") {
      const digit = digits || url.searchParams.get("Digits") || "";
      const apartmentId = url.searchParams.get("apartment_id");
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      if (digit === "1") {
        const promptUrl = audioMap.get("host_confirmed");
        if (promptUrl) {
          twiml += `<Play>${promptUrl}</Play>`;
        } else {
          // Fallback to English if no Yiddish recording
          twiml += `<Say voice="alice">Thank you, we will call you back to confirm a guest according to your convenience.</Say>`;
        }
        twiml += `<Hangup/></Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      } else if (digit === "2") {
        // Ask for new bed count
        const promptUrl = audioMap.get("host_update_beds");
        const encodedFrom = encodeURIComponent(from);
        twiml += `<Gather finishOnKey="#" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=host_update_beds_save&amp;apartment_id=${apartmentId}&amp;From=${encodedFrom}" method="POST" timeout="15">`;
        if (promptUrl) {
          twiml += `<Play>${promptUrl}</Play>`;
        } else {
          // Fallback to English if no Yiddish recording
          twiml += `<Say voice="alice">How many beds can you offer this Shabbos? Enter the number and press pound.</Say>`;
        }
        twiml += `</Gather></Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      } else {
        const encodedFrom = encodeURIComponent(from);
        twiml += `<Say voice="alice"> Oops this is an invalid option </Say>`;
        twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=host_shabbos&amp;From=${encodedFrom}</Redirect>`;
        twiml += `</Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      }
    }

    // Host update beds save (registered)
    if (step === "host_update_beds_save") {
      const apartmentId = url.searchParams.get("apartment_id");
      const bedCount = parseInt(digits || "0");
      if (apartmentId && bedCount > 0) {
        await supabase.from("apartments").update({ number_of_beds: bedCount }).eq("id", apartmentId);
      }
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      const promptUrl = audioMap.get("host_update_beds_saved");
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        // Fallback to English if no Yiddish recording
        twiml += `<Say voice="alice">We will call you back to confirm a guest according to your convenience.</Say>`;
      }
      twiml += `<Hangup/></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Host unregistered beds (not registered)
    if (step === "host_unreg_beds") {
      const bedCount = parseInt(digits || "0");
      // Save as a temporary call record
      if (bedCount > 0) {
        await supabase.from("weekly_availability_calls").insert({
          week_id: weekId,
          caller_phone: from,
          beds_offered: bedCount,
          response_type: "yes",
        });
      }
      const encodedFrom = encodeURIComponent(from);
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      // Try call_audio_config first, then fall back to voicemail_audio_prompts
      const privateConfig = getConfigAudio("host_unreg_private");
      const promptUrl = privateConfig.audioUrl || audioMap.get("host_unreg_private");
      twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=host_unreg_private&amp;From=${encodedFrom}" method="POST" timeout="15">`;
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">איז אייער אכסניא א פריוואטע אכסניא, דרוקט 1. ס'איז ביי אייך אינדערהיים, דרוקט 2.</Say>`;
      }
      twiml += `</Gather></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Host unregistered private/home
    if (step === "host_unreg_private") {
      const digit = digits || url.searchParams.get("Digits") || "";
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      // Try call_audio_config first, then fall back to voicemail_audio_prompts
      const finalConfig = getConfigAudio("host_unreg_final");
      const promptUrl = finalConfig.audioUrl || audioMap.get("host_unreg_final");
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">מיר וועלן אייך פערזענליך פארבינדן צו באשטעטיגן א גאסט לויט אייער באקוועמליכקייט.</Say>`;
      }
      twiml += `<Hangup/></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Register as host
    if (step === "register_host") {
      const encodedFrom = encodeURIComponent(from);
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      const promptUrl = audioMap.get("register_beds");
      twiml += `<Gather finishOnKey="#" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=register_beds_save&amp;From=${encodedFrom}" method="POST" timeout="15">`;
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">ביטע לייגט אריין די סכום בעטן וואס איר האט עוועילעבל פאר געסט און נאכדעם דרוקט פאונד.</Say>`;
      }
      twiml += `</Gather></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Register beds save
    if (step === "register_beds_save") {
      const bedCount = parseInt(digits || "0");
      if (bedCount > 0) {
        await supabase.from("apartments").insert({ phone_number: from, number_of_beds: bedCount });
      }
      const encodedFrom = encodeURIComponent(from);
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      const promptUrl = audioMap.get("register_private");
      twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=register_private&amp;From=${encodedFrom}" method="POST" timeout="15">`;
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">איז אייער אכסניא א פריוואטע אכסניא, דרוקט 1. ס'איז ביי אייך אינדערהיים, דרוקט 2.</Say>`;
      }
      twiml += `</Gather></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Register private/home
    if (step === "register_private") {
      const encodedFrom = encodeURIComponent(from);
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      const promptUrl = audioMap.get("register_frequency");
      twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=register_frequency&amp;From=${encodedFrom}" method="POST" timeout="15">`;
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">ווי אפט ווילט איר באקומען די פאון קאלס? אויף א וואכנטליכע פארנעם ווען עס פעלט אויס, דרוקט 1. נאר ספעציעלע שבתים, דרוקט 2.</Say>`;
      }
      twiml += `</Gather></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Register frequency
    if (step === "register_frequency") {
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      const promptUrl = audioMap.get("register_final");
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">יישר כח פאר'ן זיך איינשרייבן. ווען איר באקומט די פאון קאל און איר ענטפערט אז איר זענט גרייט צו נעמען געסט, וועלן מיר נאר שיקן געסט נאכדעם וואס מיר האבן זיך פערזענליך פארבינדן מיט אייך און באשטעטיגן א גאסט לויט אייער באקוועמליכקייט.</Say>`;
      }
      twiml += `<Hangup/></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Leave message for office
    if (step === "leave_message") {
      // Play greeting and ask caller to select a voicemail box (1-4)
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      
      // Check if there's a voicemail menu greeting audio configured
      const voicemailMenuUrl = audioMap.get("voicemail_menu");
      
      twiml += `<Gather numDigits="1" finishOnKey="" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=record_voicemail&amp;From=${encodeURIComponent(from)}" method="POST" timeout="15">`;
      
      if (voicemailMenuUrl) {
        twiml += `<Play>${voicemailMenuUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">Please select a voicemail box. Press 1 for general inquiries. Press 2 for host registration. Press 3 for availability. Press 4 for other messages.</Say>`;
      }
      
      twiml += `</Gather>`;
      twiml += `<Say voice="alice">We did not receive your selection. Let me repeat.</Say>`;
      twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=leave_message&amp;From=${encodeURIComponent(from)}</Redirect>`;
      twiml += `</Response>`;
      
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Record voicemail to selected box
    if (step === "record_voicemail") {
      const boxSelection = digits || url.searchParams.get("Digits") || "1";
      
      // Map selection to voicemail box numbers
      let mailboxId = "99"; // Default box
      let mailboxName = "General";
      
      if (boxSelection === "1") {
        mailboxId = "101"; // General inquiries
        mailboxName = "General Inquiries";
      } else if (boxSelection === "2") {
        mailboxId = "102"; // Host registration
        mailboxName = "Host Registration";
      } else if (boxSelection === "3") {
        mailboxId = "103"; // Availability
        mailboxName = "Availability";
      } else if (boxSelection === "4") {
        mailboxId = "104"; // Other
        mailboxName = "Other Messages";
      }
      
      console.log(`Recording voicemail to box ${mailboxId} (${mailboxName})`);
      
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      
      // Play recording prompt specific to the box if available
      const promptUrl = audioMap.get(`voicemail_prompt_${boxSelection}`);
      if (promptUrl) {
        twiml += `<Play>${promptUrl}</Play>`;
      } else {
        twiml += `<Say voice="alice">You selected ${mailboxName}. Please leave your message after the tone. Include your name and phone number.</Say>`;
      }
      
      // Record to the selected mailbox
      twiml += `<Record maxLength="120" transcribe="true" transcribeCallback="${supabaseUrl}/functions/v1/handle-weekly-availability?step=save_voicemail&amp;mailbox=${mailboxId}" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=voicemail_complete&amp;mailbox=${mailboxId}" />`;
      twiml += `</Response>`;
      
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Voicemail recording complete
    if (step === "voicemail_complete") {
      const mailboxId = url.searchParams.get("mailbox") || "99";
      
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      twiml += `<Say voice="alice">Thank you for your message. We will get back to you soon. Goodbye.</Say>`;
      twiml += `<Hangup/>`;
      twiml += `</Response>`;
      
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Save voicemail transcription
    if (step === "save_voicemail") {
      const mailboxId = url.searchParams.get("mailbox") || "99";
      const transcription = formData?.get("TranscriptionText") || "";
      const recordingUrl = formData?.get("RecordingUrl") || "";
      const recordingSid = formData?.get("RecordingSid") || "";
      
      console.log(`Voicemail transcription received for box ${mailboxId}:`, transcription);
      
      // Save to database
      try {
        await supabase.from("voicemails").insert({
          voicemail_box_id: parseInt(mailboxId),
          caller_phone: from,
          recording_url: recordingUrl,
          recording_sid: recordingSid,
          transcription: transcription,
          status: "new"
        });
        console.log(`Voicemail saved to box ${mailboxId}`);
      } catch (error) {
        console.error("Error saving voicemail:", error);
      }
      
      return new Response("", { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Admin options (placeholder)
    if (step === "admin_options") {
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      twiml += `<Say voice="alice">עדמין אפציעס קומען בקרוב.</Say>`;
      twiml += `<Hangup/></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Step 2: Process initial response (1=yes, 2=no, 3=friday)
    if (step === "process_response") {
      // Get Digits from URL if not in formData (happens on redirect after timeout)
      if (!digits) {
        digits = url.searchParams.get("Digits") || "";
      }
      
      // Get From parameter from URL if not in formData
      if (!from) {
        try {
          const formFrom = formData?.get("From");
          from = formFrom ? String(formFrom) : url.searchParams.get("From") || "";
        } catch {
          from = url.searchParams.get("From") || "";
        }
      }

      // Find apartment - use apartment_id if provided (for outbound calls), otherwise lookup by phone
      let apartment = null;
      const aptId = apartmentId || url.searchParams.get("apartment_id");
      
      if (aptId) {
        // Outbound call - we already have the apartment_id
        const { data } = await supabase
          .from("apartments")
          .select("id, person_name, name_recording_url")
          .eq("id", aptId)
          .maybeSingle();
        apartment = data;
        console.log("Found apartment by ID:", apartment?.person_name, aptId);
      } else {
        // Inbound call - lookup by phone number
        const normalizedFrom = from?.replace(/[\s\-\(\)\+]/g, '');
        
        if (normalizedFrom) {
          const { data: exactMatch } = await supabase
            .from("apartments")
            .select("id, person_name, name_recording_url")
            .eq("phone_number", from)
            .maybeSingle();
          
          apartment = exactMatch;
          
          // If no exact match, try normalized lookup
          if (!apartment) {
            const { data: allApartments } = await supabase
              .from("apartments")
              .select("id, person_name, name_recording_url, phone_number")
              .not("phone_number", "is", null);
            
            if (allApartments) {
              apartment = allApartments.find(apt => 
                apt.phone_number?.replace(/[\s\-\(\)\+]/g, '') === normalizedFrom
              );
            }
          }
          
          if (apartment) {
            console.log("Found apartment by phone:", apartment.person_name, from);
          }
        }
      }

      // If no apartment found, check if this person has called before (from Excel batch)
      let callerName = contactName;
      if (!apartment && weekId) {
        const { data: previousCall } = await supabase
          .from("weekly_availability_calls")
          .select("caller_name")
          .eq("caller_phone", from)
          .eq("week_id", weekId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (previousCall?.caller_name) {
          callerName = previousCall.caller_name;
          console.log("Found previous caller name for response:", callerName);
        }
      }

      console.log("Process response - apartment found:", apartment?.person_name, "digits:", digits, "caller:", callerName);

      const aptIdFinal = aptId || apartment?.id;

      if (digits === "1") {
        // YES - Available this week
        // FIRST: Check if we already have enough beds for this week
        if (weekId) {
          const { data: bedTracking } = await supabase
            .from('weekly_bed_tracking')
            .select('beds_needed, beds_confirmed')
            .eq('week_id', weekId)
            .maybeSingle();
          
          const bedsNeeded = bedTracking?.beds_needed || 30;
          const bedsConfirmed = bedTracking?.beds_confirmed || 0;
          
          if (bedsConfirmed >= bedsNeeded) {
            // Already have enough beds - thank them but don't ask for more
            console.log(`Already have enough beds (${bedsConfirmed}/${bedsNeeded}) - thanking caller without asking for more`);
            
            let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
            twiml += `<Say voice="alice">Thank you so much for your willingness to help! However, we already have all the beds we need for this week. We really appreciate your support. Goodbye.</Say>`;
            twiml += `<Hangup/>`;
            twiml += `</Response>`;
            
            return new Response(twiml, {
              headers: { "Content-Type": "text/xml", ...corsHeaders },
            });
          }
        }
        
        // Get audio from new config system
        const beforeNameConfig = getConfigAudio('before_name');
        const afterNameConfig = getConfigAudio('after_name');
        const bedsQuestionConfig = getConfigAudio('beds_question');
        
        // Fallback to legacy audio
        const thankYouMrUrl = beforeNameConfig.audioUrl || audioMap.get("thank_you_mr");
        const bedsQuestionUrl = bedsQuestionConfig.audioUrl || audioMap.get("beds_question");
        
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        
        // Play "Thank you" or before-name audio
        if (beforeNameConfig.audioUrl) {
          twiml += `<Play>${beforeNameConfig.audioUrl}</Play>`;
        } else if (thankYouMrUrl) {
          twiml += `<Play>${thankYouMrUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${beforeNameConfig.text || "Thank you"}</Say>`;
        }
        
        // Always use text-to-speech for person's name (not recording)
        // Use apartment name if found, otherwise use name from Excel or previous call
        const nameToSay = apartment?.person_name || callerName;
        if (nameToSay) {
          console.log("Saying name via TTS:", nameToSay);
          twiml += `<Say voice="alice">${nameToSay}</Say>`;
        } else {
          console.log("No name found to say");
        }
        
        // Play after-name audio if configured
        if (afterNameConfig.audioUrl) {
          twiml += `<Play>${afterNameConfig.audioUrl}</Play>`;
        } else if (afterNameConfig.text) {
          twiml += `<Say voice="alice">${afterNameConfig.text}</Say>`;
        }
        
        // Ask for bed count - audio INSIDE Gather for barge-in
        const contactNameParam = callerName ? `&amp;contact_name=${encodeURIComponent(callerName)}` : '';
        twiml += `<Gather finishOnKey="#" action="${supabaseUrl}/functions/v1/handle-weekly-availability?step=save_beds&amp;apartment_id=${aptIdFinal || ''}&amp;response=yes${contactNameParam}" method="POST" timeout="15">`;
        
        if (bedsQuestionConfig.audioUrl) {
          twiml += `<Play>${bedsQuestionConfig.audioUrl}</Play>`;
        } else if (bedsQuestionUrl) {
          twiml += `<Play>${bedsQuestionUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${bedsQuestionConfig.text || "How many beds do you have available? Enter the number and press pound."}</Say>`;
        }
        
        twiml += `</Gather>`;
        twiml += `<Say voice="alice">We did not receive your response. Let me repeat.</Say>`;
        const nameParam = callerName ? `&amp;contact_name=${encodeURIComponent(callerName)}` : '';
        twiml += `<Redirect>${supabaseUrl}/functions/v1/handle-weekly-availability?step=process_response&amp;apartment_id=${aptIdFinal || ''}&amp;Digits=1&amp;From=${encodeURIComponent(from)}${nameParam}</Redirect>`;
        twiml += `</Response>`;

        return new Response(twiml, {
          headers: { "Content-Type": "text/xml", ...corsHeaders },
        });

      } else if (digits === "2") {
        // NO - Not available
        // Check for existing response this week and delete it first
        console.log("No response - weekId:", weekId, "aptId:", aptIdFinal, "from:", from);
        
        if (weekId) {
          // Delete any previous response from this phone number this week
          const { data: existingResponse } = await supabase
            .from("weekly_availability_calls")
            .select("*")
            .eq("week_id", weekId)
            .eq("caller_phone", from)
            .maybeSingle();

          if (existingResponse) {
            console.log("Found existing response, deleting:", existingResponse.response_type);
            
            // If previous response was "yes" with beds, decrement the bed count
            if (existingResponse.response_type === "yes" && existingResponse.beds_offered && existingResponse.apartment_id) {
              await supabase.rpc('increment_beds_confirmed', {
                p_week_id: weekId,
                p_beds: -existingResponse.beds_offered // Negative to decrement
              });
              console.log(`Decremented ${existingResponse.beds_offered} beds from week total`);
            }

            // Delete the old response
            await supabase
              .from("weekly_availability_calls")
              .delete()
              .eq("id", existingResponse.id);
          }

          // Insert new "no" response
          const { data: insertData, error: insertError } = await supabase.from("weekly_availability_calls").insert({
            week_id: weekId,
            apartment_id: aptIdFinal || null,
            caller_phone: from,
            caller_name: apartment?.person_name || callerName || null,
            response_type: "no",
            call_sid: callSid
          });
          
          if (insertError) {
            console.error("Error inserting no response:", insertError);
          } else {
            console.log("No response saved successfully for", from);
          }
        } else {
          console.error("Cannot save no response - missing weekId", { weekId, from });
        }

        // Use new config system for decline message
        const declineConfig = getConfigAudio('decline');
        const thankYouNoUrl = declineConfig.audioUrl || audioMap.get("thank_you_no");
        
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        
        if (declineConfig.audioUrl) {
          twiml += `<Play>${declineConfig.audioUrl}</Play>`;
        } else if (thankYouNoUrl) {
          twiml += `<Play>${thankYouNoUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${declineConfig.text || "Thank you for letting us know. Goodbye."}</Say>`;
        }
        
        twiml += `<Hangup/>`;
        twiml += `</Response>`;

        return new Response(twiml, {
          headers: { "Content-Type": "text/xml", ...corsHeaders },
        });

      } else if (digits === "3") {
        // FRIDAY CALLBACK - Call back on Friday
        // Check for existing response this week and delete it first
        console.log("Friday callback - weekId:", weekId, "aptId:", aptIdFinal, "from:", from);
        
        if (weekId) {
          // Delete any previous response from this phone number this week
          const { data: existingResponse } = await supabase
            .from("weekly_availability_calls")
            .select("*")
            .eq("week_id", weekId)
            .eq("caller_phone", from)
            .maybeSingle();

          if (existingResponse) {
            console.log("Found existing response, deleting:", existingResponse.response_type);
            
            // If previous response was "yes" with beds, decrement the bed count
            if (existingResponse.response_type === "yes" && existingResponse.beds_offered && existingResponse.apartment_id) {
              await supabase.rpc('increment_beds_confirmed', {
                p_week_id: weekId,
                p_beds: -existingResponse.beds_offered // Negative to decrement
              });
              console.log(`Decremented ${existingResponse.beds_offered} beds from week total`);
            }

            // Delete the old response
            await supabase
              .from("weekly_availability_calls")
              .delete()
              .eq("id", existingResponse.id);
          }

          // Insert new friday_callback response
          const { data: insertData, error: insertError } = await supabase.from("weekly_availability_calls").insert({
            week_id: weekId,
            apartment_id: aptIdFinal || null,
            caller_phone: from,
            caller_name: apartment?.person_name || callerName || null,
            response_type: "friday_callback",
            call_sid: callSid
          });
          
          if (insertError) {
            console.error("Error inserting friday_callback:", insertError);
          } else {
            console.log("Friday callback saved successfully for", from);
          }
        } else {
          console.error("Cannot save friday_callback - missing weekId", { weekId, from });
        }

        // Use new config system for Friday callback message
        const fridayConfig = getConfigAudio('friday_callback');
        const thankYouFridayUrl = fridayConfig.audioUrl || audioMap.get("thank_you_friday");
        
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        
        if (fridayConfig.audioUrl) {
          twiml += `<Play>${fridayConfig.audioUrl}</Play>`;
        } else if (thankYouFridayUrl) {
          twiml += `<Play>${thankYouFridayUrl}</Play>`;
        } else {
          twiml += `<Say voice="alice">${fridayConfig.text || "Thank you. We will call you back on Friday. Goodbye."}</Say>`;
        }
        
        twiml += `<Hangup/>`;
        twiml += `</Response>`;

        return new Response(twiml, {
          headers: { "Content-Type": "text/xml", ...corsHeaders },
        });

      } else {
        // Invalid option
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        twiml += `<Say voice="alice">Invalid option. Goodbye.</Say>`;
        twiml += `<Hangup/>`;
        twiml += `</Response>`;

        return new Response(twiml, {
          headers: { "Content-Type": "text/xml", ...corsHeaders },
        });
      }
    }

    // Step 3: Save bed count
    if (step === "save_beds") {
      const bedCount = parseInt(digits || "0");
      const responseType = url.searchParams.get("response") || "yes";

      // Find apartment by phone number if not provided
      let aptId = apartmentId;
      let foundApartment = null;
      if (!aptId && from) {
        const normalizedFrom = from.replace(/[\s\-\(\)\+]/g, '');
        
        // Try exact match first
        const { data: exactMatch } = await supabase
          .from("apartments")
          .select("id, person_name")
          .eq("phone_number", from)
          .maybeSingle();
        
        foundApartment = exactMatch;
        
        // If no exact match, try normalized lookup
        if (!foundApartment) {
          const { data: allApartments } = await supabase
            .from("apartments")
            .select("id, person_name, phone_number")
            .not("phone_number", "is", null);
          
          if (allApartments) {
            foundApartment = allApartments.find(apt => 
              apt.phone_number?.replace(/[\s\-\(\)\+]/g, '') === normalizedFrom
            );
          }
        }
        
        aptId = foundApartment?.id;
      }

      // Check for existing response this week and delete it first
      // Save response with bed count (apartment_id optional for Excel batch calls)
      console.log("Saving beds response - weekId:", weekId, "aptId:", aptId, "bedCount:", bedCount, "from:", from);
      
      if (weekId && bedCount > 0) {
        let apartmentName = null;
        let callerName = contactName;
        
        // Get apartment name if apartment exists
        if (aptId) {
          // Use foundApartment if we already have it from the lookup above
          if (foundApartment?.person_name) {
            apartmentName = foundApartment.person_name;
          } else {
            const { data: apartment } = await supabase
              .from("apartments")
              .select("person_name")
              .eq("id", aptId)
              .maybeSingle();
            apartmentName = apartment?.person_name;
          }
        }

        // Delete any previous response from this phone number this week
        const { data: existingResponse } = await supabase
          .from("weekly_availability_calls")
          .select("*")
          .eq("week_id", weekId)
          .eq("caller_phone", from)
          .maybeSingle();

        if (existingResponse) {
          console.log("Found existing response, deleting:", existingResponse.response_type);
          
          // Save the caller name from previous response if available
          if (existingResponse.caller_name && !apartmentName) {
            callerName = existingResponse.caller_name;
          }
          
          // If previous response was "yes" with beds, decrement the old bed count
          if (existingResponse.response_type === "yes" && existingResponse.beds_offered && existingResponse.apartment_id) {
            await supabase.rpc('increment_beds_confirmed', {
              p_week_id: weekId,
              p_beds: -existingResponse.beds_offered // Negative to decrement
            });
            console.log(`Decremented ${existingResponse.beds_offered} beds from week total`);
          }

          // Delete the old response
          await supabase
            .from("weekly_availability_calls")
            .delete()
            .eq("id", existingResponse.id);
        }

        // Insert new yes response with beds
        const { data: insertData, error: insertError } = await supabase.from("weekly_availability_calls").insert({
          week_id: weekId,
          apartment_id: aptId || null,
          caller_phone: from,
          caller_name: apartmentName || callerName,
          response_type: responseType,
          beds_offered: bedCount,
          call_sid: callSid
        });
        
        if (insertError) {
          console.error("Error inserting yes response with beds:", insertError);
        } else {
          console.log("Yes response with", bedCount, "beds saved successfully for", from);
        }

        // ALWAYS increment beds confirmed - this is the main tracking for sequential calling
        // This ensures beds_confirmed updates even for callers not in the apartments table
        const { error: rpcError } = await supabase.rpc('increment_beds_confirmed', {
          p_week_id: weekId,
          p_beds: bedCount
        });
        
        if (rpcError) {
          console.error("Error incrementing beds_confirmed:", rpcError);
        } else {
          console.log(`Successfully incremented beds_confirmed by ${bedCount}`);
        }

        // ALWAYS create bed confirmation record - even for unregistered callers
        // This ensures the sequential calling system knows they responded
        await supabase.from("bed_confirmations").insert({
          week_id: weekId,
          apartment_id: aptId || null,  // null is OK for unregistered callers
          beds_confirmed: bedCount,
          confirmed_via: "phone_call_weekly_check"
        });

        // Also update apartment records if apartment exists in database
        if (aptId) {
          // Update apartment availability
          await supabase
            .from("apartments")
            .update({ available_this_week: true })
            .eq("id", aptId);
          
          console.log("Apartment availability updated");
        } else {
          console.log("Unregistered caller - bed_confirmations record created without apartment_id");
        }
      } else {
        console.error("Cannot save beds response - missing weekId or invalid bedCount", { weekId, bedCount, from });
      }

      // Use new config system for accept confirmation and goodbye
      const acceptConfig = getConfigAudio('accept_confirmation');
      const goodbyeConfig = getConfigAudio('goodbye');
      
      let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
      
      // Play accept confirmation - "Thank you very much! Your registration has been saved successfully."
      if (acceptConfig.audioUrl) {
        twiml += `<Play>${acceptConfig.audioUrl}</Play>`;
      } else if (acceptConfig.text) {
        twiml += `<Say voice="alice">${acceptConfig.text}</Say>`;
      }
      
      // Only play goodbye if there's actual content (not just "!")
      if (goodbyeConfig.audioUrl) {
        twiml += `<Play>${goodbyeConfig.audioUrl}</Play>`;
      } else if (goodbyeConfig.text && goodbyeConfig.text !== "!") {
        twiml += `<Say voice="alice">${goodbyeConfig.text}</Say>`;
      }
      
      twiml += `<Hangup/>`;
      twiml += `</Response>`;

      return new Response(twiml, {
        headers: { "Content-Type": "text/xml", ...corsHeaders },
      });
    }

    // Fallback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Invalid request. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { "Content-Type": "text/xml", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in handle-weekly-availability:", error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, there was an error. Please try again later. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      headers: { "Content-Type": "text/xml", ...corsHeaders },
    });
  }
});
