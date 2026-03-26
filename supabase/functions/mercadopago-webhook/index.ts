/**
 * MERCADO PAGO WEBHOOK HANDLER
 * This function processes notifications from Mercado Pago:
 * 1. Validates the incoming notification
 * 2. Fetches full payment details from MP API
 * 3. Updates the 'store_sales' table with final status and approval details
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

  // Answer MP immediately to stop retries
  // (We process in the background within the function's execution)
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const client = new MercadoPagoConfig({ 
    accessToken: Deno.env.get("MP_ACCESS_TOKEN")!,
  });
  const payment = new Payment(client);

  try {
    const body = await req.json();
    console.log("MP Webhook Received:", JSON.stringify(body));

    // Mercado Pago provides notifications for 'payment', 'merchant_order', etc.
    // We only care about payments here.
    if (body.type === "payment" || (body.action && body.action.startsWith("payment."))) {
      const paymentId = body.data?.id || body.resource?.split('/').pop();

      if (!paymentId) {
        console.warn("No payment ID found in webhook body");
        return response;
      }

      // Fetch payment details from MP
      const mpPayment = await payment.get({ id: paymentId });
      console.log(`Processing payment ${paymentId}: ${mpPayment.status} (${mpPayment.status_detail})`);

      // Update Database
      const updateData: any = {
        status: mpPayment.status,
        status_detail: mpPayment.status_detail,
      };

      if (mpPayment.status === "approved") {
        updateData.approved_at = mpPayment.date_approved || new Date().toISOString();
        updateData.total_amount = mpPayment.transaction_amount;
        updateData.shipping_amount = mpPayment.metadata?.shipping_amount || 0;
        updateData.items = JSON.parse(mpPayment.metadata?.items || "[]");
        updateData.customer_name = `${mpPayment.payer?.first_name || ""} ${mpPayment.payer?.last_name || ""}`.trim();
        updateData.customer_email = mpPayment.payer?.email;
        updateData.customer_cpf = mpPayment.payer?.identification?.number;
        updateData.customer_phone = mpPayment.metadata?.customer_phone;
      }

      // Upsert to ensure we create the record if it doesn't exist (e.g., if /create failed to save)
      const { error } = await supabase
        .from("store_sales")
        .upsert({
          payment_id: parseInt(paymentId),
          ...updateData,
          created_at: mpPayment.date_created || new Date().toISOString()
        }, { onConflict: 'payment_id' });

      if (error) {
        console.error(`DB Update Error for ${paymentId}:`, error);
      } else {
        console.log(`Successfully processed shipment/sale update for ${paymentId}`);
      }
    }

    return response;

  } catch (err) {
    console.error("Webhook Processing Exception:", err);
    // Still return 200 to MP to avoid infinite retries if the issue is logic-side
    return response;
  }
});
