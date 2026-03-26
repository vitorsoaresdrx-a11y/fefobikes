/**
 * MERCADO PAGO CHECKOUT & LISTING EDGE FUNCTION
 * This function handles:
 * 1. POST /create - Creating a new payment in Mercado Pago
 * 2. GET /list - Listing approved sales from the store_sales table
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MercadoPagoConfig, { Payment } from "https://esm.sh/mercadopago@2.0.11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const client = new MercadoPagoConfig({ 
    accessToken: Deno.env.get("MP_ACCESS_TOKEN")!,
    options: { timeout: 5000 } 
  });
  const payment = new Payment(client);

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/mercadopago-checkout\/?/, "");

    // --- LIST APPROVED SALES ---
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

    // --- CREATE PAYMENT ---
    if (req.method === "POST") {
      const body = await req.json();
      const { itens, frete, cliente, cartao } = body;

      if (!itens || !frete || !cliente || !cartao) {
        throw new Error("Missing required fields (itens, frete, cliente, cartao)");
      }

      // Calculate totals
      const itemsTotal = itens.reduce((acc: number, item: any) => acc + (item.preco_unitario * item.quantidade), 0);
      const totalAmount = itemsTotal + Number(frete.valor);

      // Prepare MP internal items for history/reporting
      const mpItems = [
        ...itens.map((i: any) => ({
          title: i.nome,
          unit_price: Number(i.preco_unitario),
          quantity: Number(i.quantidade),
          category_id: "cycling",
        })),
        {
          title: `Frete: ${frete.descricao || "Rodonaves"}`,
          unit_price: Number(frete.valor),
          quantity: 1,
          category_id: "shipping",
        }
      ];

      // Create Payment Request
      const paymentRequest: any = {
        body: {
          transaction_amount: Number(totalAmount.toFixed(2)),
          token: cartao.token,
          description: `Compra Fefo Bikes - ${cliente.nome}`,
          installments: Number(cartao.parcelas),
          payment_method_id: body.payment_method_id || "master", // Standard methods
          payer: {
            email: cliente.email,
            identification: {
              type: "CPF",
              number: cliente.cpf.replace(/\D/g, ""),
            },
            first_name: cliente.nome.split(" ")[0],
            last_name: cliente.nome.split(" ").slice(1).join(" ") || "Cliente",
          },
          notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
          metadata: {
            customer_phone: cliente.telefone,
            shipping_description: frete.descricao,
            shipping_amount: frete.valor,
            items: JSON.stringify(itens)
          }
        }
      };

      const result = await payment.create(paymentRequest);

      // Save initial sale in DB (unapproved yet, webhook will update)
      await supabase.from("store_sales").insert({
        payment_id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        total_amount: totalAmount,
        shipping_amount: frete.valor,
        items: itens,
        customer_name: cliente.nome,
        customer_email: cliente.email,
        customer_cpf: cliente.cpf.replace(/\D/g, ""),
        customer_phone: cliente.telefone,
      });

      return new Response(JSON.stringify({
        pagamento_id: result.id,
        status: result.status,
        status_detail: result.status_detail,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("Payment Error:", err);
    return new Response(JSON.stringify({ 
      error: "Falha ao processar pagamento", 
      details: err.message,
      status_detail: err.status_detail || "internal_error" 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
