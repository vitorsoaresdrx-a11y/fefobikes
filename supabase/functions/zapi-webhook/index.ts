import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Evolution API sends events like MESSAGES_UPSERT, CONNECTION_UPDATE
    const event = body.event || "";

    // Handle CONNECTION_UPDATE events
    if (event === "CONNECTION_UPDATE") {
      console.log("Connection update:", body.data?.state);
      return new Response(JSON.stringify({ ok: true, event: "connection_update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process MESSAGES_UPSERT
    if (event !== "MESSAGES_UPSERT") {
      return new Response(JSON.stringify({ ok: true, ignored: event || "unknown_event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgData = body.data;
    if (!msgData) {
      return new Response(JSON.stringify({ ok: true, ignored: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = msgData.key || {};
    const isFromMe = key.fromMe === true;
    const remoteJid = key.remoteJid || "";

    // Skip status broadcasts
    if (remoteJid.includes("status@broadcast") || remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ ok: true, ignored: "broadcast_or_group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net)
    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
    const messageId = key.id || "";

    // Extract message content
    const messageObj = msgData.message || {};
    let content = "";
    let type = "text";
    let mediaUrl: string | null = null;

    if (messageObj.conversation) {
      content = messageObj.conversation;
    } else if (messageObj.extendedTextMessage?.text) {
      content = messageObj.extendedTextMessage.text;
    } else if (messageObj.imageMessage) {
      type = "image";
      content = messageObj.imageMessage.caption || "[image]";
      mediaUrl = messageObj.imageMessage.url || null;
    } else if (messageObj.audioMessage) {
      type = "audio";
      content = "[audio]";
      mediaUrl = messageObj.audioMessage.url || null;
    } else if (messageObj.documentMessage) {
      type = "document";
      content = messageObj.documentMessage.fileName || "[document]";
      mediaUrl = messageObj.documentMessage.url || null;
    } else if (messageObj.videoMessage) {
      type = "document";
      content = messageObj.videoMessage.caption || "[video]";
      mediaUrl = messageObj.videoMessage.url || null;
    }

    if (!phone || (!content && !mediaUrl)) {
      return new Response(JSON.stringify({ ok: true, ignored: "empty_payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve tenant_id
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    const tenantId = tenantRow?.id ?? null;

    let convId: string | null = null;

    // Extract contact info from Evolution payload
    const pushName = msgData.pushName || null;
    const contactName = pushName;

    if (isFromMe) {
      // Outgoing message — find existing conversation
      const { data: byPhone } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", phone)
        .maybeSingle();

      if (!byPhone) {
        return new Response(JSON.stringify({ ok: true, ignored: "from_me_no_conv" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      convId = byPhone.id;

      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: content || `[${type}]`,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);

      await supabase.from("whatsapp_messages").insert({
        conversation_id: convId,
        message_id: messageId,
        from_me: true,
        type,
        content: content || `[${type}]`,
        media_url: mediaUrl,
        status: "sent",
        tenant_id: tenantId,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Incoming message ---
    const { data: existing } = await supabase
      .from("whatsapp_conversations")
      .select("id, unread_count")
      .eq("contact_phone", phone)
      .maybeSingle();

    if (existing) {
      convId = existing.id;

      const updates: Record<string, unknown> = {
        last_message: content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: (existing.unread_count || 0) + 1,
      };
      if (contactName) updates.contact_name = contactName;

      await supabase
        .from("whatsapp_conversations")
        .update(updates)
        .eq("id", convId);
    } else {
      const insertData: Record<string, unknown> = {
        contact_phone: phone,
        contact_name: contactName,
        last_message: content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        status: "open",
        tenant_id: tenantId,
      };

      const { data: newConv } = await supabase
        .from("whatsapp_conversations")
        .insert(insertData)
        .select("id")
        .single();

      convId = newConv!.id;
    }

    // Save incoming message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: convId,
      message_id: messageId,
      from_me: false,
      type,
      content: content || `[${type}]`,
      media_url: mediaUrl,
      status: "delivered",
      tenant_id: tenantId,
    });

    // Trigger AI responder for incoming text messages
    if (type === "text" && content) {
      supabase.functions.invoke("ai-responder", {
        body: { conversationId: convId, phone, message: content },
      }).catch((err: unknown) => console.error("AI responder invoke error:", err));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
