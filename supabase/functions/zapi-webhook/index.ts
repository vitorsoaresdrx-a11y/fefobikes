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

    // Z-API sends different payload structures
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
    const phone = String(rawPhone)
      .replace("@c.us", "")
      .replace("@lid", "")
      .replace(/\D/g, "");
    const messageId = body.messageId || body.id?.id || (Array.isArray(body.ids) ? body.ids[0] : "") || "";
    const rawText = body.text?.message ?? body.text ?? body.body ?? body.message ?? body.caption ?? "";
    const text =
      typeof rawText === "string"
        ? rawText
        : typeof rawText === "object" && rawText !== null
          ? String((rawText as { message?: unknown }).message ?? "")
          : String(rawText ?? "");
    const content = text.trim();
    const contactName = body.chatName || body.senderName || body.pushName || null;
    const contactPhoto = body.senderPhoto || body.photo || null;
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

    // Find or create conversation
    const { data: existing } = await supabase
      .from("whatsapp_conversations")
      .select("id, unread_count")
      .eq("contact_phone", phone)
      .maybeSingle();

    let convId: string;

    if (existing) {
      convId = existing.id;
        const updates: Record<string, unknown> = {
          last_message: content || `[${type}]`,
          last_message_at: new Date().toISOString(),
        };
        if (contactName) updates.contact_name = contactName;
        if (contactPhoto) updates.contact_photo = contactPhoto;
      if (!isFromMe) updates.unread_count = (existing.unread_count || 0) + 1;

      await supabase
        .from("whatsapp_conversations")
        .update(updates)
        .eq("id", convId);
    } else {
      const { data: newConv } = await supabase
        .from("whatsapp_conversations")
        .insert({
            contact_phone: phone,
            contact_name: contactName,
            contact_photo: contactPhoto,
            last_message: content || `[${type}]`,
            last_message_at: new Date().toISOString(),
            unread_count: isFromMe ? 0 : 1,
            status: "open",
          })
        .select("id")
        .single();
      convId = newConv!.id;
    }

    // Save message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: convId,
      message_id: messageId,
      from_me: isFromMe,
      type,
      content: text || `[${type}]`,
      media_url: mediaUrl,
      status: isFromMe ? "sent" : "delivered",
    });

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
