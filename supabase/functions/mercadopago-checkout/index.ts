import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const accessToken = Deno.env.get("MP_ACCESS_TOKEN");

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("store_sales")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { itens, frete, cliente } = body;

      if (!itens || !frete || !accessToken) {
        throw new Error("Dados obrigatórios ausentes (itens ou frete).");
      }

      const freteValor = Number(frete.valor || 0);
      if (isNaN(freteValor)) throw new Error("Valor de frete inválido.");

      const payer: any = {
        email: cliente?.email || "contato@fefobikes.com.br", // MP strictly requires an email
      };

      if (cliente?.nome) payer.name = cliente.nome;

      // Conditional formatting for optional data
      const phoneDigits = cliente?.telefone?.replace(/\D/g, "");
      if (phoneDigits && phoneDigits.length >= 10) {
        payer.phone = {
          area_code: phoneDigits.slice(0, 2),
          number: phoneDigits.slice(2, 11)
        };
      }

      const cpfDigits = cliente?.cpf?.replace(/\D/g, "");
      if (cpfDigits && cpfDigits.length >= 11) {
        payer.identification = {
          type: "CPF",
          number: cpfDigits
        };
      }

      const payload = {
        items: [
          ...itens.map((i: any) => ({
            title: i.nome,
            unit_price: Number(Number(i.preco_unitario).toFixed(2)),
            quantity: Number(i.quantity),
            currency_id: "BRL",
          })),
          {
            title: `Frete: ${frete.descricao || "Entrega"}`,
            unit_price: Number(freteValor.toFixed(2)),
            quantity: 1,
            currency_id: "BRL",
          }
        ],
        payer,
        back_urls: {
          success: "https://fefobikes.vercel.app/loja?status=success",
          failure: "https://fefobikes.vercel.app/loja?status=failure",
          pending: "https://fefobikes.vercel.app/loja?status=pending",
        },
        auto_return: "approved",
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
        external_reference: `${Date.now()}-checkout`,
        metadata: {
          shipping_description: frete.descricao
        }
      };

      console.log("PAYLOAD MP DEBUG:", JSON.stringify(payload, null, 2));

      const mpResponse = await fetch("https://api.mercadopago.com/v1/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error("MP API Error:", JSON.stringify(mpData));
        const cause = mpData.cause?.map((c: any) => c.description).join(", ");
        throw new Error(cause || mpData.message || "Falha ao gerar pagamento.");
      }

      return new Response(JSON.stringify({
        init_point: mpData.init_point,
        preference_id: mpData.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("Fatal Error:", err.message);
    return new Response(JSON.stringify({ 
      error: "Falha na geração do pagamento", 
      details: err.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
