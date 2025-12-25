import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ensureCurrentWeek } from '../_shared/ensure-current-week.ts';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call the next person in queue
async function callNextPerson(supabase: any, weekId: string): Promise<{ success: boolean; done?: boolean; message: string; calling?: any }> {
  // First check if we still need beds
  const { data: tracking } = await supabase
    .from('weekly_bed_tracking')
    .select('*')
    .eq('week_id', weekId)
    .maybeSingle();

  const bedsNeeded = tracking?.beds_needed || 30;
  const bedsConfirmed = tracking?.beds_confirmed || 0;

  console.log(`Checking beds: ${bedsConfirmed}/${bedsNeeded}`);

  if (bedsConfirmed >= bedsNeeded) {
    // Clear the queue - we're done!
    await supabase
      .from('call_queue')
      .delete()
      .eq('week_id', weekId);

    console.log('All beds filled! Stopping calls.');
    return {
      success: true,
      done: true,
      message: `Done! We have ${bedsConfirmed}/${bedsNeeded} beds confirmed.`
    };
  }

  // Get next person in queue
  const { data: nextInQueue } = await supabase
    .from('call_queue')
    .select('*')
    .eq('week_id', weekId)
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextInQueue) {
    console.log('Queue empty - all hosts called');
    return {
      success: true,
      done: true,
      message: `No more people in queue. Still need ${bedsNeeded - bedsConfirmed} beds.`
    };
  }

  // Mark this person as "calling"
  await supabase
    .from('call_queue')
    .update({ 
      status: 'calling',
      call_started_at: new Date().toISOString()
    })
    .eq('id', nextInQueue.id);

  // Make the call
  try {
    // Use step=outbound_weekly_check for automated weekly availability calls
    const callbackUrl = `${supabaseUrl}/functions/v1/handle-weekly-availability?step=outbound_weekly_check&apartment_id=${nextInQueue.apartment_id}&week_id=${weekId}&queue_id=${nextInQueue.id}`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    console.log(`Calling ${nextInQueue.host_name} at ${nextInQueue.phone_number}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: nextInQueue.phone_number,
        From: twilioPhoneNumber,
        Url: callbackUrl,
        Method: 'POST',
        // Status callback for when call ends - this triggers automatic next call
        StatusCallback: `${supabaseUrl}/functions/v1/sequential-bed-calls?week_id=${weekId}&queue_id=${nextInQueue.id}&action=call_ended`,
        StatusCallbackEvent: 'completed',
        StatusCallbackMethod: 'POST',
      }),
    });

    const twilioData = await response.json();

    if (response.ok) {
      await supabase
        .from('call_queue')
        .update({ 
          call_sid: twilioData.sid,
          status: 'in_progress'
        })
        .eq('id', nextInQueue.id);

      return {
        success: true,
        message: `Calling ${nextInQueue.host_name}...`,
        calling: {
          name: nextInQueue.host_name,
          phone: nextInQueue.phone_number,
          callSid: twilioData.sid
        }
      };
    } else {
      // Mark as failed and try next person
      await supabase
        .from('call_queue')
        .update({ 
          status: 'failed',
          error: twilioData.message || 'Call failed'
        })
        .eq('id', nextInQueue.id);

      console.log(`Call failed to ${nextInQueue.host_name}, trying next...`);
      
      // Automatically try the next person
      return await callNextPerson(supabase, weekId);
    }
  } catch (error) {
    await supabase
      .from('call_queue')
      .update({ 
        status: 'failed',
        error: error.message
      })
      .eq('id', nextInQueue.id);

    // Try next person on error
    return await callNextPerson(supabase, weekId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auto-create current week if it doesn't exist
    await ensureCurrentWeek(supabaseUrl, supabaseServiceKey);
    
    // Check if this is a Twilio callback (form data) or API call (JSON)
    const contentType = req.headers.get('content-type') || '';
    const url = new URL(req.url);
    
    // Handle Twilio status callback when a call ends
    const callbackAction = url.searchParams.get('action');
    const queueId = url.searchParams.get('queue_id');
    const weekId = url.searchParams.get('week_id');
    
    if (callbackAction === 'call_ended' && queueId && weekId) {
      console.log(`Call ended for queue item ${queueId}`);
      
      // Parse Twilio form data
      let callStatus = 'completed';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        callStatus = formData.get('CallStatus') as string || 'completed';
      }

      console.log(`Call status: ${callStatus}`);

      // Update queue item status based on Twilio status
      const finalStatus = ['completed', 'answered'].includes(callStatus) ? 'completed' : 'no_answer';
      
      await supabase
        .from('call_queue')
        .update({ 
          status: finalStatus,
          completed_at: new Date().toISOString(),
          error: callStatus !== 'completed' ? callStatus : null
        })
        .eq('id', queueId);

      // Wait a moment then automatically call the next person
      // (Give time for any bed confirmations to be recorded)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if we still need beds and call next person
      const result = await callNextPerson(supabase, weekId);
      console.log('Auto-calling next result:', result.message);

      // Return empty TwiML (Twilio expects this)
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { 
        headers: { 'Content-Type': 'text/xml', ...corsHeaders } 
      });
    }

    // Handle JSON API calls from frontend
    const body = await req.json();
    const { week_id, action } = body;

    if (action === 'status') {
      const { data: queue } = await supabase
        .from('call_queue')
        .select('*')
        .eq('week_id', week_id)
        .order('priority', { ascending: true });

      const { data: tracking } = await supabase
        .from('weekly_bed_tracking')
        .select('*')
        .eq('week_id', week_id)
        .maybeSingle();

      const bedsNeeded = tracking?.beds_needed || 30;
      const bedsConfirmed = tracking?.beds_confirmed || 0;
      const pendingCount = queue?.filter(q => q.status === 'pending').length || 0;
      const inProgressItem = queue?.find(q => q.status === 'in_progress' || q.status === 'calling');

      return new Response(
        JSON.stringify({
          success: true,
          bedsNeeded,
          bedsConfirmed,
          bedsStillNeeded: Math.max(0, bedsNeeded - bedsConfirmed),
          queueLength: pendingCount,
          currentCall: inProgressItem ? { name: inProgressItem.host_name, phone: inProgressItem.phone_number } : null,
          isRunning: !!inProgressItem || pendingCount > 0,
          queue: queue || []
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (action === 'stop') {
      await supabase
        .from('call_queue')
        .delete()
        .eq('week_id', week_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Call queue cleared' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (action === 'start') {
      // Check current bed status
      const { data: tracking } = await supabase
        .from('weekly_bed_tracking')
        .select('*')
        .eq('week_id', week_id)
        .maybeSingle();

      const bedsNeeded = tracking?.beds_needed || 30;
      const bedsConfirmed = tracking?.beds_confirmed || 0;

      if (bedsConfirmed >= bedsNeeded) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `Already have enough beds! ${bedsConfirmed}/${bedsNeeded} confirmed.`,
            done: true
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Get hosts who want weekly calls
      const { data: apartments } = await supabase
        .from('apartments')
        .select('*')
        .eq('wants_weekly_calls', true)
        .not('phone_number', 'is', null)
        .order('last_helped_date', { ascending: true, nullsFirst: true })
        .order('times_helped', { ascending: true });

      if (!apartments || apartments.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No hosts configured for weekly calls'
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Filter out hosts who already confirmed for this week
      // Check BOTH bed_confirmations AND weekly_availability_calls
      const { data: existingConfirmations } = await supabase
        .from('bed_confirmations')
        .select('apartment_id')
        .eq('week_id', week_id)
        .eq('voided', false);

      const { data: availabilityCalls } = await supabase
        .from('weekly_availability_calls')
        .select('apartment_id, caller_phone')
        .eq('week_id', week_id);

      const confirmedApartmentIds = new Set(existingConfirmations?.map(c => c.apartment_id) || []);
      const respondedPhones = new Set(availabilityCalls?.map(c => c.caller_phone?.replace(/[\s\-\(\)\+]/g, '')) || []);
      
      const apartmentsToCall = apartments.filter(apt => {
        // Skip if apartment already confirmed via bed_confirmations
        if (confirmedApartmentIds.has(apt.id)) return false;
        
        // Skip if phone number already responded via weekly_availability_calls
        const normalizedPhone = apt.phone_number?.replace(/[\s\-\(\)\+]/g, '');
        if (normalizedPhone && respondedPhones.has(normalizedPhone)) return false;
        
        return true;
      });

      if (apartmentsToCall.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'All hosts have already responded',
            done: true
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Clear existing queue and create new one
      await supabase
        .from('call_queue')
        .delete()
        .eq('week_id', week_id);

      // Insert new queue
      const queueItems = apartmentsToCall.map((apt, index) => ({
        week_id,
        apartment_id: apt.id,
        host_name: apt.person_name || 'Unknown',
        phone_number: apt.phone_number,
        priority: index + 1,
        status: 'pending',
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('call_queue')
        .insert(queueItems);

      console.log(`Queue created with ${apartmentsToCall.length} hosts. Starting automatic calls...`);

      // AUTOMATICALLY START CALLING THE FIRST PERSON
      const result = await callNextPerson(supabase, week_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Started automatic calling! ${apartmentsToCall.length} hosts in queue. ${result.message}`,
          queueLength: apartmentsToCall.length,
          bedsNeeded,
          bedsConfirmed,
          bedsStillNeeded: bedsNeeded - bedsConfirmed,
          currentCall: result.calling
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Manual next (in case needed)
    if (action === 'next') {
      const result = await callNextPerson(supabase, week_id);
      return new Response(
        JSON.stringify(result),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in sequential-bed-calls:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
