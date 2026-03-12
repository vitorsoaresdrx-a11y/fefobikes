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
    const isFromMe = body.fromMe === true;
    const phone = body.phone || body.chatId?.replace("@c.us", "") || "";
    const messageId = body.messageId || body.id?.id || "";
    const rawText = body.text?.message || body.text || body.body || body.message || body.caption || "";
    const text = typeof rawText === "string" ? rawText : (rawText?.message || JSON.stringify(rawText) || "");
    const senderName = body.senderName || body.chatName || null;
    const senderPhoto = body.senderPhoto || null;
    const type = body.isMedia ? (body.mimetype?.startsWith("image") ? "image" : body.mimetype?.startsWith("audio") ? "audio" : "document") : "text";
    const mediaUrl = body.mediaUrl || null;

    if (!phone) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
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
        last_message: text || `[${type}]`,
        last_message_at: new Date().toISOString(),
      };
      if (senderName) updates.contact_name = senderName;
      if (senderPhoto) updates.contact_photo = senderPhoto;
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
          contact_name: senderName,
          contact_photo: senderPhoto,
          last_message: text || `[${type}]`,
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
