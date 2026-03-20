import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Build the full product catalog context */
async function buildBusinessContext(supabase: any): Promise<string> {
  const [partsRes, bikesRes] = await Promise.all([
    supabase
      .from("parts")
      .select("id, name, sku, category, sale_price, pix_price, material, color, rim_size, gears, description")
      .eq("visible_on_storefront", true)
      .order("name"),
    supabase
      .from("bike_models")
      .select("id, name, sku, category, sale_price, pix_price, brand, color, rim_size, frame_size, weight_kg, description")
      .eq("visible_on_storefront", true)
      .order("name"),
  ]);

  const parts = partsRes.data || [];
  const bikes = bikesRes.data || [];

  let ctx = "=== CATÁLOGO DE PRODUTOS (LOJA) ===\n";
  for (const p of parts) {
    const price = p.pix_price && p.pix_price > 0 ? `R$${p.pix_price}` : p.sale_price ? `R$${p.sale_price}` : "Sob consulta";
    ctx += `- ${p.name} (SKU: ${p.sku}) | ${p.category} | Preço: ${price} | Specs: ${[p.material, p.color, p.rim_size].filter(Boolean).join(", ")}\n`;
    if (p.description) ctx += `  Desc: ${p.description.slice(0, 50)}...\n`;
  }

  ctx += "\n=== CATÁLOGO DE BIKES ===\n";
  for (const b of bikes) {
    const price = b.pix_price && b.pix_price > 0 ? `R$${b.pix_price}` : b.sale_price ? `R$${b.sale_price}` : "Sob consulta";
    ctx += `- ${b.name} (SKU: ${b.sku}) | ${b.brand} | ${b.category} | Preço: ${price} | Specs: ${[b.color, b.rim_size, b.frame_size].filter(Boolean).join(", ")}\n`;
    if (b.description) ctx += `  Desc: ${b.description.slice(0, 100)}...\n`;
  }

  return ctx;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const businessContext = await buildBusinessContext(supabase);

    const SYSTEM_PROMPT = `Você é o Fefo AI, consultor técnico da Fefo Bikes (Sorocaba, SP).
Seu objetivo é ajudar clientes com dúvidas sobre bikes de performance e sugerir produtos do catálogo abaixo.

REGRAS:
1. Sempre que sugerir um produto ou bike, você DEVE incluir o link no formato bit.ly/fefobikes-[SKU] (ex: bit.ly/fefobikes-OGGI72).
2. Use o contexto do catálogo para responder preços e especificações.
3. Formate as respostas com quebras de linha para ficar legível.
4. Seja especialista em mecânica e performance.
5. Se o cliente pedir o link da loja geral, mande fefobikes.com.br/loja.
`;

    const groqMessages = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\nCONTEXTO DO CATÁLOGO:\n${businessContext}` },
      ...history,
      { role: "user", content: message }
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
          max_tokens: 1024,
          temperature: 0.7
        }),
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500, headers: corsHeaders });
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
