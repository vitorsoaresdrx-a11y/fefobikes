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
  const preference = new Preference(client);

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

      if (!itens || !frete || !cliente) {
        throw new Error("Missing required fields (itens, frete, cliente)");
      }

      const itemsTotal = itens.reduce((acc: number, item: any) => acc + (item.preco_unitario * item.quantidade), 0);
      const totalAmount = itemsTotal + Number(frete.valor);

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
            identification: { type: "CPF", number: cliente.cpf.replace(/\D/g, "") },
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
            shipping_description: frete.descricao,
            shipping_amount: frete.valor,
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
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("Payment Error:", err);
    return new Response(JSON.stringify({ 
      error: "Falha ao gerar preferência de pagamento", 
      details: err.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
