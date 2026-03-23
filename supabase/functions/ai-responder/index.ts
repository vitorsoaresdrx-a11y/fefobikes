import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { buildBusinessContext, getCustomerContext, getServiceOrdersByPhone, cancelServiceOrder, getActiveOSContext } from "./context.ts";
import { toolDefinitions, executeCalcularFrete } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_BASE = "https://evolution.fefobikes.com.br";
const ELEVENLABS_VOICE_ID = "xNGAXaCH8MaasNuo7Hr7";

function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: Deno.env.get("EVOLUTION_API_KEY")!,
  };
}

function instanceName(tenantId: string): string {
  return `fefo-${tenantId.replace(/-/g, "").slice(0, 12)}`;
}

/** Convert text to speech via ElevenLabs and return base64 */
async function textToSpeechBase64(text: string): Promise<string> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }

  const audioBuffer = await res.arrayBuffer();
  return base64Encode(audioBuffer);
}

/** Check if currently within business hours (Sorocaba, SP) */
function isBusinessHours(): { open: boolean; message: string } {
  const now = new Date();
  const brHour = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = brHour.getDay();
  const hour = brHour.getHours();

  if (day === 0) return { open: false, message: "Estamos fechados aos domingos. Retornamos na segunda-feira às 9h." };
  if (day === 6) {
    if (hour >= 9 && hour < 14) return { open: true, message: "" };
    return { open: false, message: "Aos sábados funcionamos das 9h às 14h. Retornamos na segunda-feira às 9h." };
  }
  if (hour >= 9 && hour < 18) return { open: true, message: "" };
  return { open: false, message: "Nosso horário é de segunda a sexta das 9h às 18h e sábados das 9h às 14h." };
}

const SYSTEM_PROMPT = `Você é o assistente virtual da Fefo Bikes.

AÇÕES E FERRAMENTAS:
- VENDAS: Use o "CATÁLOGO". Se não tiver o item, informe educadamente. Jamais invente preços.
- O.S. E STATUS: Use o contexto injetado para responder sobre a bike. Se precisar de dados extras, use "consultar_ordem_servico".
- ORÇAMENTOS EXTRAS: Se houver ADICIONAL PENDENTE no contexto, peça a aprovação do cliente. Use "atualizar_aprovacao_adicional" para aprovar, negar ou cancelar.
- HUMANOS: Use "escalar_para_humano" se o cliente pedir desconto, tiver dúvidas complexas de preço ou se você não souber responder.
- CANCELAMENTO: Use "atualizar_aprovacao_adicional" com acao "cancelar_tudo" se o cliente quiser desistir de tudo. Peça confirmação antes.
- FRETE: Use "calcular_frete" (peça o CEP).

REGRAS:
- Seja extremamente conciso, casual e direto.
- SÓ use ferramentas se tiver as informações necessárias (ID da OS, ID do Adicional, etc) vindas do contexto.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, phone, message, respondWithAudio } = await req.json();

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

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    const tenantId = tenantRow?.id ?? null;
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

    // 1. Unified Context Gathering
    const [businessContext, customerContext, osContext, aiInstructionsRow, conv] = await Promise.all([
      buildBusinessContext(),
      getCustomerContext(phone),
      getActiveOSContext(phone),
      supabase.from("settings").select("value").eq("key", "ai_instructions").maybeSingle().then(({ data }: any) => data?.value?.prompt),
      supabase.from("whatsapp_conversations").select("ai_enabled, human_takeover").eq("id", conversationId).maybeSingle()
    ]);

    // 2. Human Takeover Check
    if (!conv.data || conv.data.ai_enabled === false || conv.data.human_takeover === true) {
      return new Response(
        JSON.stringify({ ok: true, skipped: conv.data?.human_takeover ? "human_takeover" : "ai_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Message History
    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("content, from_me, type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = (recentMessages || [])
      .reverse()
      .filter((m) => (m.type === "text" || m.type === "audio") && m.content && !m.content.startsWith("["))
      .map((m) => ({
        role: m.from_me ? "assistant" : "user",
        content: m.content!.replace(/^🎤 /, "").replace(/^🔊 /, ""),
      }));

    // 4. System Prompt Assembly
    const bh = isBusinessHours();
    const hoursNote = bh.open ? "Loja ABERTA." : `FECHADA. ${bh.message}`;
    const audioNote = respondWithAudio ? "\nResposta será áudio: seja extremamente conciso." : "";

    const systemContent = [
      SYSTEM_PROMPT,
      audioNote,
      `\n--- HORÁRIO ---\n${hoursNote}`,
      `\n--- CONTEXTO ---\n${businessContext}`,
      customerContext ? `\n--- CLIENTE ---\n${customerContext}` : "",
      osContext ? `\n${osContext}` : "",
      aiInstructionsRow ? `\n--- INSTRUÇÕES EXTRAS ---\n${aiInstructionsRow}` : "",
    ].join("");

    let groqMessages: any[] = [{ role: "system", content: systemContent }, ...history];

    // 5. LLM Call with Tools
    let groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: groqMessages,
        tools: toolDefinitions,
        tool_choice: "auto",
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) throw new Error("Groq API error");

    let groqData = await groqResponse.json();
    let assistantMessage = groqData.choices?.[0]?.message;

    let toolRounds = 0;
    while (assistantMessage?.tool_calls && toolRounds < 3) {
      toolRounds++;
      groqMessages.push(assistantMessage);
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result: any;

        if (fnName === "calcular_frete") {
          result = await executeCalcularFrete(args);
        } else if (fnName === "consultar_ordem_servico") {
          result = await getServiceOrdersByPhone(args.telefone || phone);
        } else if (fnName === "cancelar_ordem") {
          result = await cancelServiceOrder(phone, args.motivo);
        } else if (fnName === "atualizar_aprovacao_adicional") {
          result = await executeAtualizarAprovacao(args, supabase, phone);
        } else if (fnName === "escalar_para_humano") {
          await supabase.from("whatsapp_conversations")
            .update({ require_human: true, ai_enabled: false })
            .eq("id", conversationId);
          result = { ok: true, message: "Conversa escalada para humano." };
        } else {
          result = { error: "Tool not found" };
        }
        
        groqMessages.push({ role: "tool", content: JSON.stringify(result), tool_call_id: toolCall.id });
      }
      
      groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.1-70b-versatile", messages: groqMessages, tools: toolDefinitions, tool_choice: "auto", max_tokens: 1024 }),
      });
      groqData = await groqResponse.json();
      assistantMessage = groqData.choices?.[0]?.message;
    }

    let finalResponse = assistantMessage?.content?.trim();
    if (!finalResponse) throw new Error("Empty response from AI");

    const instName = tenantId ? instanceName(tenantId) : "fefo-default";
    let sentAsAudio = false;

    if (respondWithAudio) {
      try {
        const audioBase64 = await textToSpeechBase64(finalResponse);
        const evoRes = await fetch(`${EVOLUTION_BASE}/message/sendMedia/${instName}`, {
          method: "POST", headers: evoHeaders(), body: JSON.stringify({ number: phone, mediatype: "audio", media: `data:audio/mpeg;base64,${audioBase64}`, mimetype: "audio/mpeg", fileName: "audio.mp3" }),
        });
        if (evoRes.ok) sentAsAudio = true;
      } catch (e) { console.error("TTS failed", e); }
    }

    if (!sentAsAudio) {
      await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
        method: "POST", headers: evoHeaders(), body: JSON.stringify({ number: phone, text: finalResponse }),
      });
    }

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId, from_me: true, type: sentAsAudio ? "audio" : "text", content: sentAsAudio ? `🔊 ${finalResponse}` : finalResponse, status: "sent", tenant_id: tenantId,
    });

    await supabase.from("whatsapp_conversations").update({ last_message: sentAsAudio ? "🔊 Áudio" : finalResponse, last_message_at: new Date().toISOString() }).eq("id", conversationId);

    return new Response(JSON.stringify({ ok: true, response: finalResponse, sentAsAudio }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("AI Responder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});

/** Consolida toda a lógica de aprovação e cancelamento */
async function executeAtualizarAprovacao(
  args: { acao: string; adicional_id: string; os_id: string; valor_total: number },
  supabase: any,
  phone: string
): Promise<{ ok: boolean; mensagem_para_cliente: string }> {
  const { acao, adicional_id, os_id, valor_total } = args;

  if (acao === "aprovar") {
    await supabase.from("os_adicionais")
      .update({ status: "aprovado", approval: "aprovado" })
      .eq("id", adicional_id);

    const { data: pg } = await supabase.from("os_pagamentos")
      .select("*").eq("os_id", os_id).maybeSingle();
    if (pg) {
      await supabase.from("os_pagamentos").update({
        valor_total: Number(pg.valor_total) + valor_total,
        valor_restante: Number(pg.valor_restante) + valor_total,
      }).eq("id", pg.id);
    }
    await supabase.from("os_alertas").insert({
      os_id, numero_cliente: phone, visto: false, tipo: "sucesso",
      contexto: `✅ Cliente APROVOU o adicional de R$ ${valor_total.toFixed(2)}.`,
    });
    return { ok: true, mensagem_para_cliente: "Perfeito! Aprovação registrada, vamos seguir com o serviço. 🔧" };
  }

  if (acao === "negar" || acao === "cancelar_adicional") {
    await supabase.from("os_adicionais")
      .update({ status: "negado", approval: "negado" })
      .eq("id", adicional_id);
    await supabase.from("os_alertas").insert({
      os_id, numero_cliente: phone, visto: false, tipo: "info",
      contexto: `Cliente negou o adicional de R$ ${valor_total.toFixed(2)}.`,
    });
    return { ok: true, mensagem_para_cliente: "Entendido! Cancelei o serviço extra, seguimos só com o original. 🚲" };
  }

  if (acao === "cancelar_tudo") {
    await supabase.from("mechanic_jobs").update({ status: "cancelado" }).eq("id", os_id);
    await supabase.from("os_adicionais")
      .update({ status: "negado", approval: "negado" })
      .eq("id", adicional_id);
    await supabase.from("os_alertas").insert({
      os_id, numero_cliente: phone, visto: false, tipo: "erro",
      contexto: "🚨 Cliente cancelou TUDO pelo WhatsApp.",
    });
    return { ok: true, mensagem_para_cliente: "Compreendo. Cancelei todo o serviço. Venha buscar sua bike quando preferir. 🛑" };
  }

  return { ok: false, mensagem_para_cliente: "" };
}
