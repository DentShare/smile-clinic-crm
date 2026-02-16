import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron-triggered function: sends appointment reminders
 * Schedules: Run every hour via pg_cron or Supabase Dashboard cron
 *
 * Sends:
 * - 24h before: reminder SMS/Telegram
 * - 2h before: final reminder SMS/Telegram
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eskiz.uz SMS
async function getEskizToken(): Promise<string | null> {
  const email = Deno.env.get("ESKIZ_EMAIL");
  const password = Deno.env.get("ESKIZ_PASSWORD");
  if (!email || !password) return null;

  try {
    const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.token || null;
  } catch {
    return null;
  }
}

async function sendSMS(phone: string, message: string, eskizToken: string): Promise<boolean> {
  let formatted = phone.replace(/\D/g, "");
  if (!formatted.startsWith("998")) {
    formatted = "998" + formatted.replace(/^8/, "");
  }

  try {
    const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${eskizToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mobile_phone: formatted, message, from: "4546" }),
    });
    const data = await res.json();
    return res.ok && data.status === "waiting";
  } catch {
    return false;
  }
}

async function sendTelegram(chatId: string, message: string, botToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    let totalSent = 0;

    // Windows: appointments in 23-25 hours (24h reminder) and 1.5-2.5 hours (2h reminder)
    const windows = [
      {
        label: "24h",
        from: new Date(now.getTime() + 23 * 60 * 60 * 1000),
        to: new Date(now.getTime() + 25 * 60 * 60 * 1000),
        template: (name: string, time: string, clinic: string) =>
          `Уважаемый(ая) ${name}! Напоминаем о приёме завтра в ${time} в клинике ${clinic}. Для отмены свяжитесь с нами.`,
      },
      {
        label: "2h",
        from: new Date(now.getTime() + 1.5 * 60 * 60 * 1000),
        to: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
        template: (name: string, time: string, clinic: string) =>
          `${name}, напоминаем: ваш приём через 2 часа (${time}) в клинике ${clinic}. Ждём вас!`,
      },
    ];

    for (const window of windows) {
      // Fetch upcoming appointments that haven't been reminded yet
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id, clinic_id, start_time, status,
          patient:patients!appointments_patient_id_fkey(id, full_name, phone, notification_preferences),
          clinic:clinics!appointments_clinic_id_fkey(name, settings)
        `)
        .in("status", ["scheduled", "confirmed"])
        .gte("start_time", window.from.toISOString())
        .lte("start_time", window.to.toISOString());

      if (error) {
        console.error(`Error fetching ${window.label} appointments:`, error);
        continue;
      }

      if (!appointments || appointments.length === 0) continue;

      // Check which appointments already have reminders
      const appointmentIds = appointments.map((a: any) => a.id);
      const { data: existingNotifs } = await supabase
        .from("patient_notifications")
        .select("id")
        .in("id", appointmentIds)
        .eq("type", "sms")
        .like("message", `%${window.label === "24h" ? "завтра" : "через 2 часа"}%`);

      const alreadyNotified = new Set((existingNotifs || []).map((n: any) => n.id));

      // Get Eskiz token once per batch
      const eskizToken = await getEskizToken();

      for (const apt of appointments as any[]) {
        if (alreadyNotified.has(apt.id)) continue;

        const patient = apt.patient;
        const clinic = apt.clinic;
        if (!patient?.phone) continue;

        const prefs = patient.notification_preferences || { sms: true, telegram: true };
        const time = new Date(apt.start_time).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Tashkent",
        });

        const message = window.template(patient.full_name, time, clinic?.name || "Dentelica");

        // Send SMS
        if (prefs.sms && eskizToken) {
          const sent = await sendSMS(patient.phone, message, eskizToken);
          await supabase.from("patient_notifications").insert({
            clinic_id: apt.clinic_id,
            patient_id: patient.id,
            type: "sms",
            status: sent ? "sent" : "failed",
            message,
            sent_at: sent ? new Date().toISOString() : null,
          });
          if (sent) totalSent++;
        }

        // Send Telegram (if chat conversation exists)
        if (prefs.telegram) {
          const botToken = clinic?.settings?.telegram_bot_token;
          if (botToken) {
            // Look up Telegram chat_id from chat_conversations
            const { data: conv } = await supabase
              .from("chat_conversations")
              .select("external_chat_id")
              .eq("clinic_id", apt.clinic_id)
              .eq("channel", "telegram")
              .eq("visitor_phone", patient.phone)
              .limit(1)
              .maybeSingle();

            if (conv?.external_chat_id) {
              const sent = await sendTelegram(conv.external_chat_id, message, botToken);
              await supabase.from("patient_notifications").insert({
                clinic_id: apt.clinic_id,
                patient_id: patient.id,
                type: "telegram",
                status: sent ? "sent" : "failed",
                message,
                sent_at: sent ? new Date().toISOString() : null,
              });
              if (sent) totalSent++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron reminder error:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
