import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the user via getUser
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

    const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
    const token = Deno.env.get("ZAPI_TOKEN");
    const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "qr-code";

    let endpoint = "";
    let method = "GET";

    if (action === "qr-code") {
      endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;
    } else if (action === "status") {
      endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;
    } else if (action === "disconnect") {
      endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/disconnect`;
      method = "POST";
    }

    console.log(`Z-API action=${action}, endpoint=${endpoint}`);

    const zapiRes = await fetch(endpoint, {
      method,
      headers: { "client-token": clientToken! },
    });

    if (action === "qr-code" && zapiRes.ok) {
      const contentType = zapiRes.headers.get("content-type") || "";
      if (contentType.includes("image")) {
        const buffer = await zapiRes.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return new Response(
          JSON.stringify({ qrCode: `data:image/png;base64,${base64}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
    console.error("zapi-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
