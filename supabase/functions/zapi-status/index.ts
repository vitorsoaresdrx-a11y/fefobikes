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

    const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
    const token = Deno.env.get("ZAPI_TOKEN");
    const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "qr-code";

    let endpoint = "";
    if (action === "qr-code") {
      endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;
    } else if (action === "status") {
      endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;
    } else if (action === "disconnect") {
      endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/disconnect`;
    }

    const zapiRes = await fetch(endpoint, {
      method: action === "disconnect" ? "POST" : "GET",
      headers: { "client-token": clientToken! },
    });

    if (action === "qr-code" && zapiRes.ok) {
      // Returns the QR code as base64 image
      const contentType = zapiRes.headers.get("content-type") || "";
      if (contentType.includes("image")) {
        const buffer = await zapiRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return new Response(
          JSON.stringify({ qrCode: `data:image/png;base64,${base64}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // If it returns JSON (e.g. already connected)
      const data = await zapiRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await zapiRes.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
