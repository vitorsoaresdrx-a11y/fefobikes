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

    const callbackType = String(body.type || "");
    const isStatusOnlyEvent =
      callbackType === "MessageStatusCallback" ||
      (Array.isArray(body.ids) && !body.messageId && !body.text && !body.body && !body.caption);

    if (isStatusOnlyEvent) {
      return new Response(JSON.stringify({ ok: true, ignored: "status_callback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFromMe = body.fromMe === true;
    const rawPhone = body.phone || body.chatId || body.chatLid || "";

    if (String(rawPhone).includes("status@broadcast")) {
      return new Response(JSON.stringify({ ok: true, ignored: "status_broadcast" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract LID from chatLid field
    const rawLid = body.chatLid || "";
    const lid = String(rawLid).replace("@lid", "").replace(/\D/g, "");

    const phone = String(rawPhone)
      .replace("@c.us", "")
      .replace("@lid", "")
      .replace(/\D/g, "");

    const messageId =
      body.messageId ||
      body.id?.id ||
      (Array.isArray(body.ids) ? body.ids[0] : "") ||
      "";

    const rawText =
      body.text?.message ?? body.text ?? body.body ?? body.message ?? body.caption ?? "";
    const text =
      typeof rawText === "string"
        ? rawText
        : typeof rawText === "object" && rawText !== null
          ? String((rawText as { message?: unknown }).message ?? "")
          : String(rawText ?? "");
    const content = text.trim();

    const type = body.isMedia
      ? body.mimetype?.startsWith("image")
        ? "image"
        : body.mimetype?.startsWith("audio")
          ? "audio"
          : "document"
      : "text";

    const mediaUrl = body.mediaUrl || null;

    if (!phone || (!content && !mediaUrl)) {
      return new Response(JSON.stringify({ ok: true, ignored: "empty_payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let convId: string | null = null;

    if (isFromMe) {
      // For outgoing messages, phone is a LID — find conversation by contact_lid
      if (lid) {
        const { data: byLid } = await supabase
          .from("whatsapp_conversations")
          .select("id")
          .eq("contact_lid", lid)
          .maybeSingle();
        if (byLid) convId = byLid.id;
      }

      // Fallback: try matching by phone digits (in case it's a real number)
      if (!convId) {
        const { data: byPhone } = await supabase
          .from("whatsapp_conversations")
          .select("id")
          .eq("contact_phone", phone)
          .maybeSingle();
        if (byPhone) convId = byPhone.id;
      }

      if (!convId) {
        // Can't find the conversation — skip to avoid creating orphan chats
        return new Response(JSON.stringify({ ok: true, ignored: "from_me_no_conv" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update conversation last message
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: content || `[${type}]`,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);

      // Save the outgoing message
      await supabase.from("whatsapp_messages").insert({
        conversation_id: convId,
        message_id: messageId,
        from_me: true,
        type,
        content: content || `[${type}]`,
        media_url: mediaUrl,
        status: "sent",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Incoming message (fromMe = false) ---
    const chatName   = typeof body.chatName   === "string" ? body.chatName.trim()   : "";
    const senderName = typeof body.senderName === "string" ? body.senderName.trim() : "";
    const pushName   = typeof body.pushName   === "string" ? body.pushName.trim()   : "";
    const contactName  = chatName || senderName || pushName || null;
    const contactPhoto =
      (typeof body.photo       === "string" ? body.photo       : null) ||
      (typeof body.senderPhoto === "string" ? body.senderPhoto : null) ||
      null;

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
      if (contactName)  updates.contact_name  = contactName;
      if (contactPhoto) updates.contact_photo = contactPhoto;
      if (lid)          updates.contact_lid   = lid;

      await supabase
        .from("whatsapp_conversations")
        .update(updates)
        .eq("id", convId);
    } else {
      const insertData: Record<string, unknown> = {
        contact_phone: phone,
        contact_name:  contactName,
        contact_photo: contactPhoto,
        last_message:  content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        status: "open",
      };
      if (lid) insertData.contact_lid = lid;

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
      message_id:      messageId,
      from_me:         false,
      type,
      content:         content || `[${type}]`,
      media_url:       mediaUrl,
      status:          "delivered",
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
