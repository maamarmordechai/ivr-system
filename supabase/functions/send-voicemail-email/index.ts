import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voicemailId } = await req.json();
    
    if (!voicemailId) {
      throw new Error('voicemailId is required');
    }

    console.log('Sending email notification for voicemail:', voicemailId);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Fetch voicemail details with box information
    const { data: voicemail, error: vmError } = await supabase
      .from('voicemails')
      .select(`
        *,
        voicemail_boxes (
          id,
          box_number,
          box_name,
          email_notifications
        )
      `)
      .eq('id', voicemailId)
      .single();

    if (vmError || !voicemail) {
      throw new Error(`Failed to fetch voicemail: ${vmError?.message}`);
    }

    // Get all email recipients
    const { data: recipients, error: recipError } = await supabase
      .rpc('get_voicemail_email_recipients', { box_id: voicemail.voicemail_box_id });

    if (recipError) {
      throw new Error(`Failed to get recipients: ${recipError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      console.log('No email recipients configured for this voicemail box');
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients configured' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Email recipients:', recipients);

    // Download the voicemail MP3
    let audioAttachment = null;
    if (voicemail.recording_url) {
      try {
        // Check if it's a Supabase Storage URL
        if (voicemail.recording_url.includes('supabase.co')) {
          const audioResponse = await fetch(voicemail.recording_url);
          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            // Convert to base64 using proper chunking to avoid stack overflow
            const bytes = new Uint8Array(audioBuffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const audioBase64 = btoa(binary);
            
            audioAttachment = {
              filename: `voicemail-${voicemail.id}.mp3`,
              content: audioBase64,
              type: 'audio/mpeg'
            };
          }
        }
      } catch (audioError) {
        console.error('Error downloading audio:', audioError);
      }
    }

    // Format the email
    const receivedAt = new Date(voicemail.created_at).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'long'
    });

    const duration = voicemail.duration_seconds 
      ? `${Math.floor(voicemail.duration_seconds / 60)}:${(voicemail.duration_seconds % 60).toString().padStart(2, '0')}`
      : 'Unknown';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #1f2937; }
            .value { color: #4b5563; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .play-link { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 4px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📧 New Voicemail Received</h1>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">Voicemail Box:</span>
                <span class="value">${voicemail.voicemail_boxes?.box_number} - ${voicemail.voicemail_boxes?.box_name}</span>
              </div>
              <div class="info-row">
                <span class="label">From:</span>
                <span class="value">${voicemail.caller_phone || 'Unknown'}</span>
              </div>
              <div class="info-row">
                <span class="label">Caller Name:</span>
                <span class="value">${voicemail.caller_name || 'Not provided'}</span>
              </div>
              <div class="info-row">
                <span class="label">Duration:</span>
                <span class="value">${duration}</span>
              </div>
              <div class="info-row">
                <span class="label">Received:</span>
                <span class="value">${receivedAt}</span>
              </div>
              ${voicemail.transcription ? `
                <div class="info-row">
                  <span class="label">Transcription:</span>
                  <div class="value" style="margin-top: 8px; font-style: italic;">${voicemail.transcription}</div>
                </div>
              ` : ''}
              ${voicemail.recording_url ? `
                <div style="text-align: center; margin-top: 20px;">
                  <a href="${voicemail.recording_url}" class="play-link">🎵 Listen to Voicemail</a>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This is an automated notification from your accommodation system.</p>
              <p>Voicemail ID: ${voicemail.id}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Voicemail Received

Voicemail Box: ${voicemail.voicemail_boxes?.box_number} - ${voicemail.voicemail_boxes?.box_name}
From: ${voicemail.caller_phone || 'Unknown'}
Caller Name: ${voicemail.caller_name || 'Not provided'}
Duration: ${duration}
Received: ${receivedAt}

${voicemail.transcription ? `Transcription: ${voicemail.transcription}\n\n` : ''}
${voicemail.recording_url ? `Listen: ${voicemail.recording_url}\n\n` : ''}
Voicemail ID: ${voicemail.id}
    `;

    // Send email via Resend
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailPayload: any = {
      from: 'Voicemail System <onboarding@resend.dev>',
      to: recipients,
      subject: `New Voicemail from ${voicemail.caller_phone || 'Unknown'} - Box ${voicemail.voicemail_boxes?.box_number}`,
      html: emailHtml,
      text: emailText,
    };

    // Add attachment if available
    if (audioAttachment) {
      emailPayload.attachments = [audioAttachment];
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    // Update voicemail record
    await supabase
      .from('voicemails')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_recipients: recipients
      })
      .eq('id', voicemailId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        recipients: recipients.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in send-voicemail-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
