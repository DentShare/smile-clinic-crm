import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get conversation details
    const { data: conv, error: convErr } = await supabase
      .from("chat_conversations")
      .select("id, channel, external_chat_id, clinic_id")
      .eq("id", conversation_id)
      .single();

    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get clinic settings for tokens
    const { data: clinic } = await supabase
      .from("clinics")
      .select("settings")
      .eq("id", conv.clinic_id)
      .single();

    const settings = (clinic?.settings as Record<string, any>) || {};

    let sent = false;
    let errorMsg = "";

    if (conv.channel === "telegram" && conv.external_chat_id) {
      const botToken = settings.telegram_bot_token;
      if (!botToken) {
        errorMsg = "Telegram bot token not configured";
      } else {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: conv.external_chat_id,
            text: content,
          }),
        });
        if (res.ok) {
          sent = true;
        } else {
          const errBody = await res.text();
          errorMsg = `Telegram API error: ${errBody}`;
          console.error(errorMsg);
        }
      }
    } else if (conv.channel === "whatsapp" && conv.external_chat_id) {
      const waToken = settings.whatsapp_api_token;
      const waPhoneId = settings.whatsapp_phone_number_id;
      if (!waToken || !waPhoneId) {
        errorMsg = "WhatsApp API not configured";
      } else {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${waPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${waToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: conv.external_chat_id,
              type: "text",
              text: { body: content },
            }),
          }
        );
        if (res.ok) {
          sent = true;
        } else {
          const errBody = await res.text();
          errorMsg = `WhatsApp API error: ${errBody}`;
          console.error(errorMsg);
        }
      }
    } else if (conv.channel === "web") {
      // Web chat — no external API needed, message is stored in DB and delivered via realtime
      sent = true;
    }

    return new Response(
      JSON.stringify({ sent, error: errorMsg || undefined }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-chat-reply error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
