import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVOLUTION_BASE = "https://evolution.fefobikes.com.br";

function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: Deno.env.get("EVOLUTION_API_KEY")!,
  };
}

/** Derive a deterministic instance name from tenant id */
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Resolve tenant
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: member } = await adminClient
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!member) {
      return new Response(JSON.stringify({ error: "No tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instName = instanceName(member.tenant_id);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "qr-code";

    console.log(`Evolution action=${action}, instance=${instName}`);

    // ── QR Code ─────────────────────────────────────────────────────────
    if (action === "qr-code") {
      // First ensure instance exists (create if needed)
      const createRes = await fetch(`${EVOLUTION_BASE}/instance/create`, {
        method: "POST",
        headers: evoHeaders(),
        body: JSON.stringify({
          instanceName: instName,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
      console.log(`Instance create status=${createRes.status}`);

      // Configure webhook right after instance creation
      const webhookRes = await fetch(`${EVOLUTION_BASE}/webhook/set/${instName}`, {
        method: "POST",
        headers: evoHeaders(),
        body: JSON.stringify({
          url: `${Deno.env.get("SUPABASE_URL")!}/functions/v1/zapi-webhook`,
          webhook_by_events: true,
          webhook_base64: false,
          enabled: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        }),
      });
      console.log(`Webhook set status=${webhookRes.status}`);

      // Fetch QR
      const qrRes = await fetch(
        `${EVOLUTION_BASE}/instance/connect/${instName}`,
        { headers: evoHeaders() }
      );
      console.log(`QR response status=${qrRes.status}`);

      if (!qrRes.ok) {
        const errText = await qrRes.text();
        console.error("QR error:", errText);
        return new Response(JSON.stringify({ error: errText }), {
          status: qrRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const qrData = await qrRes.json();
      console.log("QR data keys:", JSON.stringify(Object.keys(qrData || {})));
      // Evolution returns { qrcode: { base64: "data:image/png;base64,..." } }
      const qrCode = qrData?.qrcode?.base64 || qrData?.base64 || null;

      return new Response(JSON.stringify({ qrCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Status ──────────────────────────────────────────────────────────
    if (action === "status") {
      const statusRes = await fetch(
        `${EVOLUTION_BASE}/instance/connectionState/${instName}`,
        { headers: evoHeaders() }
      );

      if (!statusRes.ok) {
        // Instance doesn't exist yet — not connected
        return new Response(
          JSON.stringify({ connected: false, smartphoneConnected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusData = await statusRes.json();
      console.log("Evolution status:", JSON.stringify(statusData));

      // Evolution returns { instance: { state: "open" | "close" | "connecting" } }
      const state = statusData?.instance?.state || statusData?.state || "";
      const connected = state === "open";

      return new Response(
        JSON.stringify({ connected, smartphoneConnected: connected }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Disconnect ──────────────────────────────────────────────────────
    if (action === "disconnect") {
      const logoutRes = await fetch(
        `${EVOLUTION_BASE}/instance/logout/${instName}`,
        { method: "DELETE", headers: evoHeaders() }
      );
      console.log(`Logout status=${logoutRes.status}`);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("evolution-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
