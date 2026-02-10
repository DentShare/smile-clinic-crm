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
    const body = await req.json();
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const telegramChatId = String(message.chat.id);
    const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "Telegram User";

    // Find clinic by matching telegram_bot_token — we check which clinic's bot received this
    // Since Telegram sends to a single webhook URL, we need to find the clinic
    // We'll look for an existing conversation with this external_chat_id, or find the clinic by token

    // First, check for existing conversation
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id, clinic_id")
      .eq("channel", "telegram")
      .eq("external_chat_id", telegramChatId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;
    let clinicId: string;

    if (existingConv) {
      conversationId = existingConv.id;
      clinicId = existingConv.clinic_id;
    } else {
      // Find clinic with a matching telegram bot token by checking settings
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id, settings")
        .eq("is_active", true);

      let matchedClinic: { id: string } | null = null;
      if (clinics) {
        for (const c of clinics) {
          const settings = c.settings as Record<string, any> | null;
          if (settings?.telegram_bot_token) {
            // We can't know which bot received this from the payload alone,
            // so we find any clinic with telegram configured.
            // For multi-clinic setups, each clinic should have its own webhook path.
            // For now, we match by existing conversation or first configured clinic.
            matchedClinic = c;
            break;
          }
        }
      }

      if (!matchedClinic) {
        return new Response("No clinic configured for Telegram", { status: 200, headers: corsHeaders });
      }

      clinicId = matchedClinic.id;

      // Also check closed conversations to reopen
      const { data: closedConv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("channel", "telegram")
        .eq("external_chat_id", telegramChatId)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (closedConv) {
        // Reopen conversation
        await supabase
          .from("chat_conversations")
          .update({ status: "open", last_message_at: new Date().toISOString() })
          .eq("id", closedConv.id);
        conversationId = closedConv.id;
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({
            clinic_id: clinicId,
            channel: "telegram",
            external_chat_id: telegramChatId,
            visitor_name: senderName,
            status: "open",
          })
          .select("id")
          .single();

        conversationId = newConv!.id;
      }
    }

    // Insert message
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: message.text,
      channel: "telegram",
    });

    // Update last_message_at
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("error", { status: 200, headers: corsHeaders });
  }
});
