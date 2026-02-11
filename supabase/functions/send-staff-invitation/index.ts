import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  clinicId: string;
  clinicName: string;
  inviterName: string;
  specialization?: string;
}

const roleLabels: Record<string, string> = {
  clinic_admin: "Директор",
  reception: "Администратор",
  doctor: "Врач",
  nurse: "Ассистент",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Create client with user's token to verify permissions
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Get user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role, clinicId, clinicName, inviterName, specialization }: InvitationRequest = await req.json();
    console.log("Creating invitation for:", email, "role:", role, "specialization:", specialization, "clinic:", clinicId);

    // Generate secure token
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

    // Store invitation
    const { error: insertError } = await supabase
      .from("staff_invitations")
      .insert({
        clinic_id: clinicId,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
        specialization: role === 'doctor' ? specialization || null : null,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build invitation URL - use the origin from the request or fallback
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const invitationUrl = `${origin}/accept-invitation?token=${token}`;

    const roleLabel = roleLabels[role] || role;

    // Send email
    const emailResult = await resend.emails.send({
      from: "DentalCRM <onboarding@resend.dev>",
      to: [email],
      subject: `Приглашение в клинику ${clinicName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
            .role-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🦷 Приглашение в DentalCRM</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p><strong>${inviterName}</strong> приглашает вас присоединиться к клинике <strong>${clinicName}</strong> в роли:</p>
            <p><span class="role-badge">${roleLabel}</span></p>
            <p>Для завершения регистрации нажмите на кнопку ниже:</p>
            <p style="text-align: center;">
              <a href="${invitationUrl}" class="button">Принять приглашение</a>
            </p>
            <p style="color: #64748b; font-size: 14px;">
              Ссылка действительна 7 дней. Если вы не запрашивали это приглашение, проигнорируйте это письмо.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} DentalCRM. Все права защищены.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, invitationId: token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-staff-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});