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

    // 1b. Fetch Payment Details
    const { data: payment } = await supabase
      .from("os_pagamentos" as any)
      .select("valor_total, valor_pago, valor_restante")
      .eq("os_id", osId)
      .maybeSingle();

    const phone = job.customer_whatsapp?.replace(/\D/g, "");
    if (!phone) throw new Error("Customer phone not found");

    const maoDeObraValor = Number(maoDeObra || 0);
    
    // Normalize pecas structure
    const normalizedParts = pecas.map((p: any) => ({
      name: p.peca || p.part_name || p.name || "Peça",
      quantity: Number(p.quantidade || p.quantity || 1),
      price: Number(p.valor || p.unit_price || 0)
    }));

    const pecasAdicional = normalizedParts.reduce((acc: number, p: any) => acc + (p.price * p.quantity), 0);
    const totalAdicional = pecasAdicional + maoDeObraValor;

    // 2. Format message with IA
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const paymentContext = payment ? 
      `Total original: ${formatCurrency(payment.valor_total)}\nJá pago: ${formatCurrency(payment.valor_pago)}\nRestante original: ${formatCurrency(payment.valor_restante)}` :
      `Total original: ${formatCurrency(job.price)}\nStatus: Sem registro de pagamento prévio.`;

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
            content: "Você é um mecânico parceiro da Fefo Bikes. Formate um orçamento adicional curto, humano e direto para o WhatsApp.\n" +
                     "Diretrizes:\n" +
                     "- Não explique cálculos matemáticos (ex: 'X + Y = Z'). Apenas informe os valores de forma clara.\n" +
                     "- Mostre os itens adicionais com seus valores.\n" +
                     "- Se houver mão de obra extra, mencione o valor.\n" +
                     "- Informe o NOVO VALOR TOTAL do serviço (Original + Adicional) de forma simples.\n" +
                     "- Evite termos técnicos desnecessários ou frases como 'Impacto no saldo'.\n" +
                     "- Termine com a pergunta: 'Podemos seguir com esse serviço extra?'\n" +
                     "Seja executivo, gentil e use emojis moderados."
          },
          { 
            role: "user", 
            content: `Bike: ${job.bike_name}\n` +
                     `Problema: ${observacoes}\n` +
                     `Peças Adicionais: ${JSON.stringify(normalizedParts)}\n` +
                     `Mão de Obra Extra: ${formatCurrency(maoDeObraValor)}\n` +
                     `Total Adicional: ${formatCurrency(totalAdicional)}\n\n` +
                     `Contexto de Pagamento Atual:\n${paymentContext}`
          }
        ],
        temperature: 0.5,
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
    await supabase.from("os_adicionais" as any).update({ status: 'enviado' }).eq("os_id", osId).eq("status", "pendente");

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
