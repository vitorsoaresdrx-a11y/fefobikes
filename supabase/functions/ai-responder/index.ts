import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { buildBusinessContext, getCustomerContext, getServiceOrdersByPhone } from "./context.ts";
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

const SYSTEM_PROMPT = `Você é um atendente da Fefo Bikes. Responda de forma direta e natural, como um humano faria.

Regras:
- Responda apenas o que foi perguntado.
- Não sugira produtos sem o cliente demonstrar interesse explícito.
- Sem apresentações longas ou listas de opções não solicitadas.
- Tom casual, sem exageros de entusiasmo.
- Seja breve.
- O resultado esperado para a abertura (ou se a pessoa só der um oi) é apenas: "Olá! Como posso ajudar?"

Você tem acesso ao catálogo completo de bikes e peças da loja (fornecido no contexto), pode calcular frete via transportadora Rodonaves e consultar ordens de serviço da oficina.

Lembre-se:
- Sempre peça o CEP, tipo de carga e valor do produto antes de calcular frete.
- Use a tool consultar_ordem_servico para status de oficina.
- Se não souber algo, diga que vai verificar.
- Use emojis com moderação 🚴.
- Respostas em áudio devem ser AINDA mais concisas e conversacionais.`;

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

    let pendingAdditionId = null;
    let pendingOsId = null;
    let pendingAdditionValue = 0;
    let pendingAdditionProblem = "";
    let pendingAdditionStatus = "";
    
    const incomingDigits = phone.replace(/\D/g, "");
    const incomingSuffix = incomingDigits.length >= 10 ? incomingDigits.slice(-10) : incomingDigits;

    console.log(`Searching for pending additions for normalized phone: ${incomingDigits} (suffix: ${incomingSuffix})`);

    // Fetch all active jobs to match phone in JS (bypassing DB formatting issues)
    const { data: allActiveJobs } = await supabase
      .from('mechanic_jobs')
      .select('id, customer_name, customer_whatsapp')
      .neq('status', 'delivered');

    const matchedJobs = (allActiveJobs || []).filter((j: any) => {
      const dbDigits = (j.customer_whatsapp || "").replace(/\D/g, "");
      const dbSuffix = dbDigits.length >= 10 ? dbDigits.slice(-10) : dbDigits;
      return dbDigits === incomingDigits || (dbSuffix.length >= 8 && incomingSuffix.endsWith(dbSuffix)) || (incomingSuffix.length >= 8 && dbSuffix.endsWith(incomingSuffix));
    });

    if (matchedJobs.length > 0) {
      const jobIds = matchedJobs.map((j: any) => j.id);
      console.log(`Found ${matchedJobs.length} matching jobs:`, jobIds);
      
      const { data: adicionais } = await supabase
        .from('os_adicionais')
        .select('id, os_id, status, valor_total, problem')
        .in('os_id', jobIds)
        .in('status', ['enviado', 'pendente', 'negado', 'aguardando_cancelamento'])
        .order('criado_em', { ascending: false });

      if (adicionais && adicionais.length > 0) {
        const first = adicionais[0];
        pendingAdditionId = first.id;
        pendingOsId = first.os_id;
        pendingAdditionValue = Number(first.valor_total || 0);
        pendingAdditionProblem = first.problem || 'serviço extra';
        pendingAdditionStatus = first.status;
        console.log(`MATCHED pending addition ${pendingAdditionId} for OS ${pendingOsId} (Status: ${pendingAdditionStatus})`);
      }
    }

    if (pendingAdditionId) {
      const isWaitingCancel = pendingAdditionStatus === 'aguardando_cancelamento';
      
      const sysClassifyContent = isWaitingCancel 
        ? 'O cliente está decidindo um CANCELAMENTO. Classifique a mensagem dele:\n' +
          '- CANCELA_ADICIONAL: quer cancelar apenas o extra, mas seguir com o serviço original da bike.\n' +
          '- CANCELA_TUDO: quer cancelar todos os serviços da bike.\n' +
          '- VOLTAR: mudou de ideia e quer aprovar ou tirar dúvidas.\n' +
          'Responda APENAS a categoria em maiúsculo.'
        : 'O cliente tem um orçamento extra PENDENTE. Classifique a mensagem dele:\n' +
          '- APROVACAO: aceitou, concordou, "ok", "pode fazer", "sim", "faz aí", "beleza", "👍".\n' +
          '- NEGACAO: não quer, "não precisa", "deixa pra lá", "não".\n' +
          '- DUVIDA: perguntas, pechincha ou incertezas.\n' +
          '- CANCELAMENTO: expressou desejo de cancelar algo.\n\n' +
          'Responda APENAS: APROVACAO, NEGACAO, DUVIDA ou CANCELAMENTO.';

      const classificationRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: sysClassifyContent },
            { role: "user", content: `Mensagem: "${message}"` }
          ],
          max_tokens: 15,
          temperature: 0,
        }),
      });

      if (classificationRes.ok) {
        const classData = await classificationRes.json();
        const intent = (classData.choices?.[0]?.message?.content?.trim() || "").toUpperCase();
        console.log(`Classification INTENT: ${intent}`);
        
        const instName = tenantId ? instanceName(tenantId) : "fefo-default";
        let responseText = "";

        if (intent.includes("APROVACAO") || (isWaitingCancel && intent.includes("VOLTAR"))) {
          console.log(`Intent classification: ${intent}. APROVANDO orçamento na DB...`);
          await supabase.from('os_adicionais').update({ status: 'aprovado', approval: 'aprovado' }).eq('id', pendingAdditionId);
          console.log(`OS adicional ${pendingAdditionId} -> aprovado.`);
          
          const { data: pgData } = await supabase.from('os_pagamentos').select('*').eq('os_id', pendingOsId).maybeSingle();
          if (pgData) {
            await supabase.from('os_pagamentos').update({
              valor_total: Number(pgData.valor_total) + pendingAdditionValue,
              valor_restante: Number(pgData.valor_restante) + pendingAdditionValue
            }).eq('id', pgData.id);
            console.log(`OS pagamentos ${pgData.id} atualizado com novo valor: +${pendingAdditionValue}.`);
          }

          await supabase.from('os_alertas').insert({
            os_id: pendingOsId, numero_cliente: phone, visto: false, tipo: 'sucesso',
            contexto: `✅ Cliente APROVOU o orçamento extra de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAdditionValue)}.`
          });
          console.log(`Alerta de aprovação inserido para OS ${pendingOsId}.`);

          responseText = "Perfeito! Sua aprovação foi registrada na oficina e vamos seguir com o serviço da sua bike. Qualquer dúvida, é só chamar! 🔧";
        }
        else if (intent.includes("CANCELAMENTO") && !isWaitingCancel) {
          await supabase.from('os_adicionais').update({ status: 'aguardando_cancelamento' }).eq('id', pendingAdditionId);
          responseText = `Entendido! Você quer cancelar apenas o serviço extra de "${pendingAdditionProblem}" no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAdditionValue)}, ou cancelar todo o serviço da sua bike?`;
        }
        else if (intent.includes("CANCELA_ADICIONAL")) {
          await supabase.from('os_adicionais').update({ status: 'negado', approval: 'negado' }).eq('id', pendingAdditionId);
          responseText = "Certo! Cancelamos apenas o serviço extra. Vamos seguir apenas com o serviço original da sua bike conforme o planejado. 🚲";
        }
        else if (intent.includes("CANCELA_TUDO")) {
          await supabase.from('mechanic_jobs' as any).update({ status: 'cancelado' }).eq('id', pendingOsId);
          await supabase.from('os_adicionais').update({ status: 'negado', approval: 'negado' }).eq('id', pendingAdditionId);
          await supabase.from('os_alertas').insert({
            os_id: pendingOsId, numero_cliente: phone, visto: false, tipo: 'erro',
            contexto: '🚨 Cliente cancelou TODO o serviço da bike pelo WhatsApp. Verifique a retirada.'
          });
          responseText = "Compreendo. Todo o serviço da sua bike foi cancelado em nosso sistema. Por favor, entre em contato ou venha até a loja para combinarmos a retirada. 🛑";
        }
        else if (intent.includes("NEGACAO") || intent.includes("DUVIDA")) {
          if (intent.includes("NEGACAO")) await supabase.from('os_adicionais').update({ status: 'negado', approval: 'negado' }).eq('id', pendingAdditionId);
          const ctxText = intent.includes("NEGACAO") ? "Cliente negou o orçamento adicional." : "Cliente tem dúvida sobre o orçamento adicional.";
          await supabase.from('os_alertas').insert({
            os_id: pendingOsId, numero_cliente: phone, visto: false, tipo: intent.includes("NEGACAO") ? 'erro' : 'info', contexto: ctxText
          });
          await supabase.from('whatsapp_conversations').update({ require_human: true, ai_enabled: false }).eq('id', conversationId);
          
          responseText = intent.includes("NEGACAO") 
            ? "Entendido. Apontei aqui que não faremos essa parte. Vou passar para um atendente humano confirmar os detalhes finais do serviço, tudo bem?"
            : "Certo, entendi sua dúvida. Vou chamar um atendente humano para analisar seu caso e te responder melhor sobre o serviço da bike.";
        }

        if (responseText) {
          await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
            method: "POST", headers: evoHeaders(), body: JSON.stringify({ number: phone, text: responseText }),
          });
          await supabase.from("whatsapp_messages").insert({
            conversation_id: conversationId, from_me: true, type: "text", content: responseText, status: "sent", tenant_id: tenantId,
          });
          return new Response(JSON.stringify({ ok: true, processed: intent.toLowerCase() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // --- PRIORITY 2: Check global settings for generic AI chat ---
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("ai_enabled, human_takeover")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv || conv.ai_enabled === false || conv.human_takeover === true) {
      return new Response(
        JSON.stringify({ ok: true, skipped: conv?.human_takeover ? "human_takeover" : "ai_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- STANDARD CHAT FLOW ---
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

    const [businessContext, customerContext, aiInstructionsRow] = await Promise.all([
      buildBusinessContext(),
      getCustomerContext(phone),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "ai_instructions")
        .maybeSingle()
        .then(({ data }: any) => data?.value?.prompt),
    ]);

    const bh = isBusinessHours();
    const hoursNote = bh.open ? "A loja está ABERTA." : `FECHADA. ${bh.message}`;
    const audioNote = respondWithAudio ? "\n\nResponda apenas com texto curto (será áudio)." : "";

    const systemContent = [
      SYSTEM_PROMPT,
      audioNote,
      `\n--- HORÁRIO ---\n${hoursNote}`,
      `\n--- CONTEXTO ---\n${businessContext}`,
      customerContext ? `\n--- CLIENTE ---\n${customerContext}` : "",
      aiInstructionsRow ? `\n--- INSTRUÇÕES ---\n${aiInstructionsRow}` : "",
    ].join("");

    let groqMessages: any[] = [{ role: "system", content: systemContent }, ...history];

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
        let result = fnName === "calcular_frete" ? await executeCalcularFrete(args) : 
                     fnName === "consultar_ordem_servico" ? await getServiceOrdersByPhone(args.telefone || phone) : 
                     { error: "Tool not found" };
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

    if (finalResponse.includes('<function=') || finalResponse.includes('</function>')) {
      console.log("AI leaked tool tags. Retrying for clean text...");
      const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [...groqMessages, { role: "user", content: "Responda em texto simples, sem usar ferramentas, filtrando qualquer tag técnica." }],
          max_tokens: 512,
          temperature: 0.3,
        }),
      });
      const retryData = await retryRes.json();
      finalResponse = retryData.choices?.[0]?.message?.content?.trim() || finalResponse;
    }

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
