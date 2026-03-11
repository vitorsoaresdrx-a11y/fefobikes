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
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { phone, message, conversationId } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
    const token = Deno.env.get("ZAPI_TOKEN");
    const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

    // Send via Z-API
    const zapiRes = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client-token": clientToken!,
        },
        body: JSON.stringify({ phone, message }),
      }
    );

    const zapiData = await zapiRes.json();

    // Use service role to insert message
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Ensure conversation exists
    let convId = conversationId;
    if (!convId) {
      const { data: existing } = await adminClient
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", phone)
        .maybeSingle();

      if (existing) {
        convId = existing.id;
      } else {
        const { data: newConv } = await adminClient
          .from("whatsapp_conversations")
          .insert({ contact_phone: phone, last_message: message, status: "open" })
          .select("id")
          .single();
        convId = newConv?.id;
      }
    }

    // Save message
    await adminClient.from("whatsapp_messages").insert({
      conversation_id: convId,
      message_id: zapiData?.messageId || null,
      from_me: true,
      type: "text",
      content: message,
      status: "sent",
    });

    // Update conversation
    await adminClient
      .from("whatsapp_conversations")
      .update({
        last_message: message,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", convId);

    return new Response(JSON.stringify({ success: true, zapiData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
