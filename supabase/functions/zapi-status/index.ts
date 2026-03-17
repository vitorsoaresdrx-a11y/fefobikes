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
          webhook: {
            url: `${Deno.env.get("SUPABASE_URL")!}/functions/v1/zapi-webhook`,
            webhook_by_events: true,
            webhook_base64: false,
            enabled: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          },
        }),
      });
      console.log(`Webhook set status=${webhookRes.status}`);

      const readQrFromResponse = async (res: Response) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Connect failed (${res.status}): ${errText}`);
        }
        const payload = await res.json();
        const extracted = payload?.qrcode?.base64 || payload?.base64 || null;
        return { payload, extracted };
      };

      // Fetch QR (primary flow: GET)
      const qrRes = await fetch(`${EVOLUTION_BASE}/instance/connect/${instName}`, {
        method: "GET",
        headers: evoHeaders(),
      });
      console.log(`QR response status=${qrRes.status}`);

      let { payload: qrData, extracted: qrCode } = await readQrFromResponse(qrRes);

      // Fallback: some Evolution setups only return QR on POST connect
      if (!qrCode) {
        const qrPostRes = await fetch(`${EVOLUTION_BASE}/instance/connect/${instName}`, {
          method: "POST",
          headers: evoHeaders(),
        });
        console.log(`QR POST response status=${qrPostRes.status}`);
        const postParsed = await readQrFromResponse(qrPostRes);
        qrData = postParsed.payload;
        qrCode = postParsed.extracted;
      }

      console.log("QR data keys:", JSON.stringify(Object.keys(qrData || {})));

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

      // Re-set webhook every time we detect instance is connected
      if (connected) {
        const webhookUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/zapi-webhook`;
        console.log(`Setting webhook for connected instance ${instName} -> ${webhookUrl}`);
        const whRes = await fetch(`${EVOLUTION_BASE}/webhook/set/${instName}`, {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({
            url: webhookUrl,
            webhook_by_events: true,
            webhook_base64: false,
            enabled: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          }),
        });
        const whBody = await whRes.text();
        console.log(`Webhook set status=${whRes.status} body=${whBody}`);
      }

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
