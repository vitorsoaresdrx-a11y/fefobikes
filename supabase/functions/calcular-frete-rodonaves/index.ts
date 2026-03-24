import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * RODONAVES-FRETE: INTEGRAÇÃO OFICIAL
 * Esta função realiza a autenticação (Token) e a cotação real na API da Rodonaves.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { DestinationZipCode, InvoiceValue } = await req.json();

    if (!DestinationZipCode || !InvoiceValue) {
      throw new Error("CEP de destino e valor da nota são obrigatórios.");
    }

    // Variáveis de Ambiente (Supabase Secrets)
    const USER = Deno.env.get("RODONAVES_USER") || "FELIPEEUFRASIO";
    const PASS = Deno.env.get("RODONAVES_PASS") || "4P7OQH2B";

    console.log(`Iniciando cotação para CEP: ${DestinationZipCode}, Valor: ${InvoiceValue}`);

    // PASSO 1 - OBTER TOKEN
    const authParams = new URLSearchParams();
    authParams.append("grant_type", "password");
    authParams.append("username", USER);
    authParams.append("password", PASS);

    console.log(`Tentando autenticação para usuário: ${USER}`);

    const tokenResponse = await fetch("https://quotation-apigateway.rte.com.br/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: authParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Erro no Token Rodonaves (Status: ${tokenResponse.status}):`, errorText);
      return new Response(
        JSON.stringify({ ok: false, error: "Usuário ou senha da Rodonaves inválidos. Verifique as credenciais." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // PASSO 2 - GERAR COTAÇÃO
    const quotePayload = {
      OriginZipCode: "18087050", // Sorocaba/SP Fixo
      DestinationZipCode: String(DestinationZipCode).replace(/\D/g, ""), // Limpa o CEP
      TotalWeight: 38.48, // Peso Cubado Fixo
      Packages: [
        {
          Weight: 38.48,
          Length: 148,
          Height: 78,
          Width: 20
        }
      ],
      InvoiceValue: Number(InvoiceValue)
    };

    const quoteResponse = await fetch("https://quotation-apigateway.rte.com.br/api/v1/gera-cotacao", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(quotePayload)
    });

    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.json().catch(() => ({}));
      console.error("Erro na Cotação Rodonaves:", errorData);
      return new Response(
        JSON.stringify({ ok: false, error: "Não foi possível calcular o frete para esse CEP. Entre em contato conosco." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quoteResult = await quoteResponse.json();

    return new Response(
      JSON.stringify({ ok: true, data: quoteResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Falha na Integração:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
