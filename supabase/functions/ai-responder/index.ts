import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildBusinessContext } from "./context.ts";
import { toolDefinitions, executeCalcularFrete } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

const SYSTEM_PROMPT = `Você é a assistente virtual da Fefo Bikes, uma loja especializada em bikes de alta performance em Sorocaba, SP.

Seu papel é atender clientes pelo WhatsApp com simpatia, objetividade e conhecimento técnico sobre ciclismo.

Você tem acesso ao catálogo completo de bikes e peças da loja (fornecido no contexto), e pode calcular frete via transportadora Rodonaves.

Regras:
- Sempre que um cliente perguntar sobre frete ou envio, ANTES de calcular, pergunte o CEP de destino, se ele quer a bike completa montada ou somente o quadro, e o valor do produto
- Só chame a tool calcular_frete após ter os três dados confirmados: CEP, tipo de carga e valor do produto
- Responda sempre em português brasileiro, de forma direta e amigável
- Para dúvidas técnicas sobre bikes, use seu conhecimento geral de ciclismo
- Se não souber responder algo, diga que vai verificar e que um atendente entrará em contato
- Nunca invente preços ou disponibilidade — use apenas o contexto fornecido
- Mensagens curtas e diretas, sem excessos`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, phone, message } = await req.json();

    if (!conversationId || !phone || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_params" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve tenant_id for data isolation
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    const tenantId = tenantRow?.id ?? null;

    // Check if AI is enabled for this conversation
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("ai_enabled")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv || conv.ai_enabled === false) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "ai_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch last 10 messages for conversation history
    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("content, from_me, type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = (recentMessages || [])
      .reverse()
      .filter((m) => m.type === "text" && m.content)
      .map((m) => ({
        role: m.from_me ? "assistant" : "user",
        content: m.content!,
      }));

    // Build business context
    const businessContext = await buildBusinessContext();

    // Prepare messages for Groq
    const groqMessages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n--- CONTEXTO DO CATÁLOGO ---\n${businessContext}`,
      },
      ...history,
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

    // Call Groq with tool calling
    let groqResponse = await fetch(
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
          tools: toolDefinitions,
          tool_choice: "auto",
          max_tokens: 1024,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: "groq_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let groqData = await groqResponse.json();
    let assistantMessage = groqData.choices?.[0]?.message;

    // Handle tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      groqMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === "calcular_frete") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await executeCalcularFrete(args);
            groqMessages.push({
              role: "tool",
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            } as any);
          } catch (err) {
            groqMessages.push({
              role: "tool",
              content: JSON.stringify({
                error: err instanceof Error ? err.message : "Erro ao calcular frete",
              }),
              tool_call_id: toolCall.id,
            } as any);
          }
        }
      }

      groqResponse = await fetch(
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
          }),
        }
      );

      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        console.error("Groq API error (tool follow-up):", groqResponse.status, errText);
        return new Response(
          JSON.stringify({ ok: false, error: "groq_tool_error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      groqData = await groqResponse.json();
      assistantMessage = groqData.choices?.[0]?.message;
    }

    const responseText = assistantMessage?.content?.trim();

    if (!responseText) {
      console.error("No response from Groq");
      return new Response(
        JSON.stringify({ ok: false, error: "empty_response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send response via Evolution API
    const instName = tenantId ? instanceName(tenantId) : "fefo-default";

    const evoRes = await fetch(
      `${EVOLUTION_BASE}/message/sendText/${instName}`,
      {
        method: "POST",
        headers: evoHeaders(),
        body: JSON.stringify({ number: phone, text: responseText }),
      }
    );

    const evoData = await evoRes.json();

    // Save AI message to DB
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      message_id: evoData?.key?.id || null,
      from_me: true,
      type: "text",
      content: responseText,
      status: "sent",
      tenant_id: tenantId,
    });

    // Update conversation
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message: responseText,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ ok: true, response: responseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("AI Responder error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
