import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_BASE = "https://evolution.fefobikes.com.br";

function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: Deno.env.get("EVOLUTION_API_KEY")!,
  };
}

function instanceName(tenantId: string): string {
  return `fefo-${tenantId.replace(/-/g, "").slice(0, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, message, conversationId } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = user.id;
    const { data: member } = await adminClient
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const instName = member ? instanceName(member.tenant_id) : "fefo-default";

    // Send via Evolution API
    const evoRes = await fetch(
      `${EVOLUTION_BASE}/message/sendText/${instName}`,
      {
        method: "POST",
        headers: evoHeaders(),
        body: JSON.stringify({ number: phone, text: message }),
      }
    );

    const evoData = await evoRes.json();

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
      message_id: evoData?.key?.id || null,
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

    return new Response(JSON.stringify({ success: true, evoData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
