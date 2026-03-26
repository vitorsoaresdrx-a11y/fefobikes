import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MercadoPagoConfig, { Preference } from "https://esm.sh/mercadopago@2.0.11";

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

  const client = new MercadoPagoConfig({ 
    accessToken: Deno.env.get("MP_ACCESS_TOKEN")!,
    options: { timeout: 10000 } 
  });
  console.log("Token check:", Deno.env.get("MP_ACCESS_TOKEN")?.substring(0, 10));
  const preference = new Preference(client);

  try {
    const url = new URL(req.url);
    console.log(`Request received: ${req.method} ${url.pathname}`);

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) {
       console.error("FATAL: MP_ACCESS_TOKEN not found in secrets!");
       throw new Error("Configuração ausente: MP_ACCESS_TOKEN");
    }

    if (req.method === "GET") {
      // ... same GET logic ...
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
      console.log("Creating Payment Preference for:", body.cliente?.nome);
      const { itens, frete, cliente } = body;

      if (!itens || !frete || !cliente) {
        throw new Error("Dados obrigatórios ausentes: itens, frete ou cliente.");
      }

      try {
        const preferenceResult = await preference.create({
          body: {
            items: [
              ...itens.map((i: any) => ({
                title: i.nome,
                unit_price: Number(i.preco_unitario),
                quantity: Number(i.quantidade),
                currency_id: "BRL",
              })),
              {
                title: `Frete: ${frete.descricao || "Rodonaves"}`,
                unit_price: Number(frete.valor),
                quantity: 1,
                currency_id: "BRL",
              }
            ],
            payer: {
              name: cliente.nome,
              email: cliente.email,
              phone: { number: cliente.telefone },
              identification: { type: "CPF", number: cliente.cpf?.replace(/\D/g, "") },
            },
            back_urls: {
              success: "https://fefobikes.vercel.app/loja?status=success",
              failure: "https://fefobikes.vercel.app/loja?status=failure",
              pending: "https://fefobikes.vercel.app/loja?status=pending",
            },
            auto_return: "approved",
            notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
            external_reference: `${Date.now()}-${cliente.nome.substring(0, 10)}`,
            metadata: {
               customer_phone: cliente.telefone,
               items: JSON.stringify(itens)
            }
          }
        });

        return new Response(JSON.stringify({
          init_point: preferenceResult.init_point,
          preference_id: preferenceResult.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (mpErr: any) {
        console.error("Mercado Pago SDK Error:", mpErr);
        return new Response(JSON.stringify({ 
          error: "O Mercado Pago recusou a conexão", 
          details: mpErr.message 
        }), {
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("Global Catch Error:", err);
    return new Response(JSON.stringify({ 
      error: "Falha técnica na função", 
      details: err.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
