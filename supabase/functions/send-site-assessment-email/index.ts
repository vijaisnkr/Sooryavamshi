// ============================================================================
// Sooryavamshi Solar Projects LLP - Supabase Edge Function
// Function: send-site-assessment-email
// Description: Dispatches formatted email notification to suryavamshisolarprojects@gmail.com
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL") || "suryavamshisolarprojects@gmail.com";

interface SiteAssessmentRecord {
  id: string;
  created_at: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  pin_code?: string | null;
  city_location: string;
  monthly_consumption: number;
  kseb_consumer_number?: string | null;
  rooftop_details?: string | null;
  status: string;
  source: string;
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();
    const record: SiteAssessmentRecord = body.record || body;

    if (!record || !record.full_name || !record.phone_number) {
      return new Response(JSON.stringify({ error: "Missing required enquiry details in payload." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customerName = record.full_name;
    const phone = record.phone_number;
    const email = record.email || "Not provided";
    const location = record.city_location;
    const pin = record.pin_code || "Not provided";
    const units = record.monthly_consumption ? `${record.monthly_consumption} kWh / month` : "Not provided";
    const ksebNo = record.kseb_consumer_number || "Not provided";
    const message = record.rooftop_details || "None";
    const dateFormatted = new Date(record.created_at || Date.now()).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "short",
    });

    const subject = `New Solar Site Assessment Request – ${customerName}`;

    // Clean HTML email template styled with Sooryavamshi visual brand
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: #073B6B; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; color: #ffffff; font-weight: 700; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #FDBA2D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .body { padding: 24px; color: #334155; }
        .badge { display: inline-block; background: #FEF3C7; color: #92400E; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .table td.label { font-weight: 600; color: #64748B; width: 35%; }
        .table td.val { color: #0F172A; font-weight: 500; }
        .highlight { color: #218739; font-weight: 700; font-size: 15px; }
        .kseb-box { background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 700; color: #073B6B; }
        .actions { margin-top: 24px; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; background: #F58220; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; margin: 0 6px; }
        .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px; text-align: center; font-size: 12px; color: #94A3B8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sooryavamshi Solar Projects LLP</h1>
          <p>Residential &amp; Commercial Solar Sizing Desk</p>
        </div>
        <div class="body">
          <span class="badge">☀️ NEW SITE ASSESSMENT LEAD</span>
          <h2 style="margin: 0 0 12px; color: #073B6B; font-size: 18px;">Customer Consultation Request</h2>
          <p style="font-size: 14px; color: #64748B; margin-bottom: 16px;">
            A new rooftop solar enquiry has been submitted on the website. Details are provided below:
          </p>
          
          <table class="table">
            <tr>
              <td class="label">Customer Name</td>
              <td class="val"><strong style="font-size: 15px; color: #073B6B;">${customerName}</strong></td>
            </tr>
            <tr>
              <td class="label">Phone Number</td>
              <td class="val"><a href="tel:${phone}" style="color: #073B6B; font-weight: 700; text-decoration: none;">📞 ${phone}</a></td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="val">${email}</td>
            </tr>
            <tr>
              <td class="label">City / Location</td>
              <td class="val"><strong>${location}</strong></td>
            </tr>
            <tr>
              <td class="label">PIN Code</td>
              <td class="val">${pin}</td>
            </tr>
            <tr>
              <td class="label">Monthly Consumption</td>
              <td class="val highlight">${units}</td>
            </tr>
            <tr>
              <td class="label">KSEB Consumer No.</td>
              <td class="val"><span class="kseb-box">${ksebNo}</span></td>
            </tr>
            <tr>
              <td class="label">Rooftop Details / Notes</td>
              <td class="val">${message}</td>
            </tr>
            <tr>
              <td class="label">Submission Time</td>
              <td class="val">${dateFormatted} (IST)</td>
            </tr>
          </table>

          <div class="actions">
            <a href="tel:${phone}" class="btn">Call Customer Now</a>
          </div>
        </div>
        <div class="footer">
          Sooryavamshi Solar Projects LLP &bull; Cherthala, Alappuzha, Kerala &bull; +91 9061626868
        </div>
      </div>
    </body>
    </html>
    `;

    // Dispatch via Resend API if key is present
    if (RESEND_API_KEY) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sooryavamshi Solar <notifications@suryavamshi.com>",
          to: [NOTIFICATION_EMAIL],
          reply_to: record.email || undefined,
          subject: subject,
          html: htmlContent,
        }),
      });

      const resendData = await resendRes.json();
      return new Response(JSON.stringify({ success: true, provider: "resend", data: resendData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If Resend API key is not configured, return clean receipt
    return new Response(
      JSON.stringify({
        success: true,
        notice: "Notification prepared. Set RESEND_API_KEY in Supabase Function Secrets to enable live transmission.",
        subject: subject,
        recipient: NOTIFICATION_EMAIL,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
