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
    // Handle both form data and URL parameters
    let from, digits, step, weekId;
    
    const url = new URL(req.url);
    
    // Always try to get URL params first
    step = url.searchParams.get("step");
    weekId = url.searchParams.get("week_id");
    from = url.searchParams.get("from");
    
    // Then try to read form data if it exists (only present on <Gather> callbacks, not redirects)
    const contentType = req.headers.get("content-type") || "";
    if (req.method === "POST" && (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data"))) {
      try {
        const text = await req.text();
        if (text) {
          const formData = new URLSearchParams(text);
          digits = formData.get("Digits") || undefined;
          // Only override 'from' if not already set from URL params
          if (!from) {
            from = formData.get("From") || formData.get("Caller") || undefined;
          }
        }
      } catch (e) {
        console.log("Could not parse form data:", e);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Email report request - Step:", step, "From:", from, "Digits:", digits, "WeekId:", weekId);

    // Step 1: Ask for confirmation
    if (!step) {
      // Build URL with proper encoding
      const confirmUrl = weekId 
        ? `${supabaseUrl}/functions/v1/email-report-trigger?step=confirm&amp;week_id=${encodeURIComponent(weekId)}&amp;from=${encodeURIComponent(from || '')}`
        : `${supabaseUrl}/functions/v1/email-report-trigger?step=confirm&amp;from=${encodeURIComponent(from || '')}`;
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="${confirmUrl}" method="POST" timeout="10">
        <Say voice="alice">To send the weekly report by email, press 1 to confirm, or press 2 to cancel.</Say>
    </Gather>
    <Say voice="alice">No response received. Goodbye.</Say>
    <Hangup/>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Step 2: Process confirmation
    if (step === "confirm") {
      if (digits === "1") {
        // Get current week (use provided weekId or fetch current)
        let targetWeekId = weekId;
        
        if (!targetWeekId) {
          const today = new Date().toISOString().split('T')[0];
          const { data: currentWeek } = await supabase
            .from('desperate_weeks')
            .select('id')
            .gte('week_end_date', today)
            .order('week_start_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!currentWeek) {
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">No current week configured. Goodbye.</Say>
    <Hangup/>
</Response>`;

            return new Response(twiml, {
              headers: { ...corsHeaders, "Content-Type": "text/xml" },
            });
          }
          
          targetWeekId = currentWeek.id;
        }

        // Trigger email report asynchronously
        fetch(`${supabaseUrl}/functions/v1/send-weekly-report`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            weekId: targetWeekId,
            emailAddresses: [] // Will use system default emails
          })
        }).catch(err => {
          console.error('Failed to trigger report email:', err);
        });
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Your weekly report is being sent by email. You should receive it shortly. Goodbye.</Say>
    <Hangup/>
</Response>`;

        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      } else {
        // User pressed 2 or other digit - cancel
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Email report cancelled. Goodbye.</Say>
    <Hangup/>
</Response>`;

        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }
    }

    // Fallback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Invalid request. Goodbye.</Say>
    <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Error in email-report-trigger:", error);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Sorry, there was an error. Please try again later. Goodbye.</Say>
    <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});
