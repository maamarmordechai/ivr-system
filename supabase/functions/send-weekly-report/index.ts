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
    const { weekId, emailAddresses } = await req.json();
    
    console.log('Generating and sending weekly report:', { weekId, emailAddresses });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Get week details
    const { data: week, error: weekError } = await supabase
      .from('desperate_weeks')
      .select('*')
      .eq('id', weekId)
      .single();

    if (weekError || !week) {
      throw new Error(`Failed to fetch week: ${weekError?.message}`);
    }

    // Get weekly tracking
    const { data: tracking } = await supabase
      .from('weekly_bed_tracking')
      .select('*')
      .eq('week_id', weekId)
      .maybeSingle();

    // Get bed confirmations with host details
    const { data: bedConfirmations } = await supabase
      .from('bed_confirmations')
      .select(`
        *,
        apartments(person_name, phone_number, address, number_of_beds)
      `)
      .eq('week_id', weekId)
      .eq('voided', false)
      .order('confirmed_at', { ascending: false });

    // Get meal confirmations
    const { data: mealConfirmations } = await supabase
      .from('meal_availabilities')
      .select(`
        *,
        meal_hosts(host_name, phone_number, address)
      `)
      .eq('week_id', weekId)
      .eq('status', 'confirmed')
      .order('responded_at', { ascending: false });

    // Get guest count from week data (expected_guests field)
    const guestCount = week.expected_guests || 0;

    // Calculate totals
    const totalBedsConfirmed = (bedConfirmations || []).reduce((sum, c) => sum + (c.beds_confirmed || 0), 0);
    const bedsNeeded = tracking?.beds_needed || 30;
    const totalFridayMeals = (mealConfirmations || []).reduce((sum, c) => sum + (c.friday_night_count || 0), 0);
    const totalSaturdayMeals = (mealConfirmations || []).reduce((sum, c) => sum + (c.saturday_day_count || 0), 0);

    // Format dates
    const weekStart = new Date(week.week_start_date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const weekEnd = new Date(week.week_end_date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Generate HTML Report
    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 900px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              padding: 30px; 
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .header h1 { margin: 0 0 10px 0; font-size: 28px; }
            .header .dates { font-size: 18px; opacity: 0.9; }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
            }
            .summary-card .label {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 8px;
            }
            .summary-card .value {
              font-size: 36px;
              font-weight: bold;
              color: #1e293b;
            }
            .summary-card .subtext {
              font-size: 12px;
              color: #94a3b8;
              margin-top: 4px;
            }
            
            .section {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 25px;
              margin-bottom: 25px;
            }
            .section h2 {
              margin: 0 0 20px 0;
              color: #1e293b;
              font-size: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #3b82f6;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background: #f1f5f9;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: #475569;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:hover {
              background: #f8fafc;
            }
            
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-success {
              background: #dcfce7;
              color: #166534;
            }
            .badge-info {
              background: #dbeafe;
              color: #1e40af;
            }
            
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 12px;
            }
            
            .no-data {
              text-align: center;
              padding: 40px;
              color: #94a3b8;
              font-style: italic;
            }
            
            @media print {
              body { padding: 0; }
              .summary-grid { page-break-inside: avoid; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Weekly Accommodation Report</h1>
            <div class="dates">${weekStart} - ${weekEnd}</div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Expected Guests</div>
              <div class="value">${guestCount || 0}</div>
            </div>
            <div class="summary-card">
              <div class="label">Beds Confirmed</div>
              <div class="value">${totalBedsConfirmed}</div>
              <div class="subtext">of ${bedsNeeded} needed</div>
            </div>
            <div class="summary-card">
              <div class="label">Confirmation Rate</div>
              <div class="value">${Math.round((totalBedsConfirmed / bedsNeeded) * 100)}%</div>
            </div>
          </div>

          ${tracking?.admin_notes ? `
            <div class="section">
              <h2>📝 Admin Notes</h2>
              <p style="color: #475569; margin: 0;">${tracking.admin_notes}</p>
            </div>
          ` : ''}

          <div class="section">
            <h2>🛏️ Bed Confirmations (${(bedConfirmations || []).length} hosts)</h2>
            ${(bedConfirmations || []).length === 0 ? 
              '<div class="no-data">No bed confirmations yet</div>' :
              `<table>
                <thead>
                  <tr>
                    <th>Host Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th style="text-align: center;">Beds</th>
                    <th>Confirmed</th>
                    <th>Via</th>
                  </tr>
                </thead>
                <tbody>
                  ${(bedConfirmations || []).map(conf => `
                    <tr>
                      <td style="font-weight: 600;">${conf.apartments?.person_name || 'Unknown'}</td>
                      <td style="color: #64748b;">${conf.apartments?.address || 'Not provided'}</td>
                      <td>${conf.apartments?.phone_number || 'N/A'}</td>
                      <td style="text-align: center;">
                        <span class="badge badge-success">${conf.beds_confirmed}</span>
                      </td>
                      <td style="font-size: 13px; color: #64748b;">
                        ${new Date(conf.confirmed_at).toLocaleDateString()} ${new Date(conf.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span class="badge badge-info">${conf.confirmed_via}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top: 15px; padding: 15px; background: #dcfce7; border-radius: 6px; color: #166534;">
                <strong>Total: ${totalBedsConfirmed} beds confirmed</strong> from ${(bedConfirmations || []).length} hosts
              </div>`
            }
          </div>

          <div class="section">
            <h2>🍽️ Meal Confirmations (${(mealConfirmations || []).length} hosts)</h2>
            ${(mealConfirmations || []).length === 0 ?
              '<div class="no-data">No meal confirmations yet</div>' :
              `<table>
                <thead>
                  <tr>
                    <th>Host Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th style="text-align: center;">Friday Night</th>
                    <th style="text-align: center;">Saturday Day</th>
                    <th>Responded</th>
                  </tr>
                </thead>
                <tbody>
                  ${(mealConfirmations || []).map(conf => `
                    <tr>
                      <td style="font-weight: 600;">${conf.meal_hosts?.host_name || 'Unknown'}</td>
                      <td style="color: #64748b;">${conf.meal_hosts?.address || 'Not provided'}</td>
                      <td>${conf.meal_hosts?.phone_number || 'N/A'}</td>
                      <td style="text-align: center;">
                        ${conf.friday_night_count ? `<span class="badge badge-success">${conf.friday_night_count}</span>` : '-'}
                      </td>
                      <td style="text-align: center;">
                        ${conf.saturday_day_count ? `<span class="badge badge-success">${conf.saturday_day_count}</span>` : '-'}
                      </td>
                      <td style="font-size: 13px; color: #64748b;">
                        ${new Date(conf.responded_at).toLocaleDateString()} ${new Date(conf.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top: 15px; padding: 15px; background: #dbeafe; border-radius: 6px; color: #1e40af;">
                <strong>Friday Night:</strong> ${totalFridayMeals} meals &nbsp;&nbsp;|&nbsp;&nbsp; 
                <strong>Saturday Day:</strong> ${totalSaturdayMeals} meals
              </div>`
            }
          </div>

          <div class="footer">
            <p>Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}</p>
            <p>Accommodation Management System</p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // If no email addresses provided, get from system settings
    let recipients = emailAddresses;
    if (!recipients || recipients.length === 0) {
      const { data: settings } = await supabase
        .from('system_email_settings')
        .select('email_addresses')
        .eq('setting_key', 'voicemail_notifications')
        .single();

      recipients = settings?.email_addresses || [];
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No email recipients configured');
    }

    console.log('Sending report to:', recipients);

    const emailPayload = {
      from: 'Reports <onboarding@resend.dev>',
      to: recipients,
      subject: `Weekly Accommodation Report - ${weekStart}`,
      html: reportHtml,
    };

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
    console.log('Report email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        recipients: recipients.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in send-weekly-report:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
