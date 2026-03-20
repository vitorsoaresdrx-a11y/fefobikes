import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { osId, pecas, observacoes, maoDeObra } = await req.json();

    if (!osId) throw new Error("osId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch OS details (Customer Phone, Bike)
    const { data: job, error: jobErr } = await supabase
      .from("mechanic_jobs" as any)
      .select("*")
      .eq("id", osId)
      .single();

    if (jobErr || !job) throw new Error("OS not found");

    const phone = job.customer_whatsapp?.replace(/\D/g, "");
    if (!phone) throw new Error("Customer phone not found");

    const maoDeObraValor = Number(maoDeObra || 0);
    const pecasAdicional = pecas.reduce((acc: number, p: any) => acc + ((p.valor || p.unit_price || 0) * (p.quantidade || p.quantity || 0)), 0);
    const totalAdicional = pecasAdicional + maoDeObraValor;

    // 2. Format message with IA
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: "Você é um mecânico profissional da Fefo Bikes. Formate um orçamento adicional curto e gentil para o WhatsApp.\n" +
                     "Use o formato sugerido: 'Identificamos [problema]. Será necessário [peças]. O valor adicional é R$[X]. Podemos continuar ou prefere deixar para outro momento?'\n" +
                     "Seja breve, profissional e use emojis com moderação. Não use markdown pesado (negrito é ok)."
          },
          { 
            role: "user", 
            content: `Bike: ${job.bike_name}\nProblema/Obs: ${observacoes}\nPeças: ${JSON.stringify(pecas)}\nMão de Obra: R$ ${maoDeObraValor.toFixed(2)}\nValor total: R$ ${totalAdicional.toFixed(2)}`
          }
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await aiRes.json();
    const formattedMessage = aiData.choices?.[0]?.message?.content?.trim();

    // 3. Send WhatsApp via Evolution API
    const instName = job.tenant_id ? instanceName(job.tenant_id) : "fefo-default";
    const formattedPhone = (phone.length >= 10 && phone.length <= 11) ? `55${phone}` : phone;

    const evoRes = await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
      method: "POST",
      headers: evoHeaders(),
      body: JSON.stringify({ number: formattedPhone, text: formattedMessage }),
    });

    if (!evoRes.ok) {
      const err = await evoRes.text();
      console.error("Evolution API error:", err);
      throw new Error(`Falha no envio do WhatsApp (Evolution API): ${err}`);
    }

    // 4. Move card to 'in_approval'
    await supabase.from("mechanic_jobs" as any).update({ status: "in_approval" }).eq("id", osId);

    // 5. Update OS Adicional status if exists
    await supabase.from("os_adicionais" as any).update({ status: 'enviado' }).eq("os_id", osId).eq("status", "rascunho");

    return new Response(JSON.stringify({ ok: true, message: formattedMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("formatar-adicional error:", err);
    // Return 200 with error property so frontend client doesn't hide behind 'non-2xx' error wrapper!
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
