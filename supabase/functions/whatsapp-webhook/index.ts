import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // WhatsApp webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      // Find clinic with this verify token
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id, settings")
        .eq("is_active", true);

      const matched = clinics?.find((c) => {
        const s = c.settings as Record<string, any> | null;
        return s?.whatsapp_verify_token === token;
      });

      if (matched) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST — incoming message
  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const msg = value.messages[0];
    const waPhoneNumberId = value.metadata?.phone_number_id;
    const senderPhone = msg.from; // e.g. "998901234567"
    const text = msg.text?.body || msg.type || "";
    const senderName = value.contacts?.[0]?.profile?.name || senderPhone;

    // Find clinic by whatsapp_phone_number_id
    const { data: clinics } = await supabase
      .from("clinics")
      .select("id, settings")
      .eq("is_active", true);

    const matchedClinic = clinics?.find((c) => {
      const s = c.settings as Record<string, any> | null;
      return s?.whatsapp_phone_number_id === waPhoneNumberId;
    });

    if (!matchedClinic) {
      console.log("No clinic matched for WA phone_number_id:", waPhoneNumberId);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const clinicId = matchedClinic.id;

    // Find or create conversation
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("channel", "whatsapp")
      .eq("external_chat_id", senderPhone)
      .eq("clinic_id", clinicId)
      .in("status", ["open", "assigned"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Check closed
      const { data: closedConv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("channel", "whatsapp")
        .eq("external_chat_id", senderPhone)
        .eq("clinic_id", clinicId)
        .eq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (closedConv) {
        await supabase
          .from("chat_conversations")
          .update({ status: "open", last_message_at: new Date().toISOString() })
          .eq("id", closedConv.id);
        conversationId = closedConv.id;
      } else {
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({
            clinic_id: clinicId,
            channel: "whatsapp",
            external_chat_id: senderPhone,
            visitor_name: senderName,
            visitor_phone: senderPhone,
            status: "open",
          })
          .select("id")
          .single();

        conversationId = newConv!.id;
      }
    }

    // Store message
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: text,
      channel: "whatsapp",
    });

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response("error", { status: 200, headers: corsHeaders });
  }
});
