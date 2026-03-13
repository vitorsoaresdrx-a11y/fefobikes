import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { station, password } = await req.json();

    if (!station || !password) {
      return new Response(
        JSON.stringify({ error: "Estação e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get station_logins from settings
    const { data: setting } = await adminClient
      .from("settings")
      .select("value, tenant_id")
      .eq("key", "station_logins")
      .limit(1)
      .single();

    if (!setting) {
      return new Response(
        JSON.stringify({ error: "Estações não configuradas. Peça ao administrador para configurar em Configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emails = setting.value as Record<string, string>;
    const email = emails[station];

    if (!email) {
      return new Response(
        JSON.stringify({ error: `Estação "${station}" não configurada.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: Record<string, unknown> = { session: authData.session };

    // For salao, also return the operator names
    if (station === "salao") {
      const { data: namesData } = await adminClient
        .from("settings")
        .select("value")
        .eq("key", "salao_names")
        .eq("tenant_id", setting.tenant_id)
        .maybeSingle();

      result.salao_names = (namesData?.value as string[]) || [];
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("station-login error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
