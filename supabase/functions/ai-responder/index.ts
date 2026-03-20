import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { buildBusinessContext, getCustomerContext, getServiceOrdersByPhone } from "./context.ts";
import { toolDefinitions, executeCalcularFrete } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Check if AI is enabled
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

    // Fetch last 10 messages for history
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

    // Build contexts in parallel
    const [businessContext, customerContext, aiInstructionsRow] = await Promise.all([
      buildBusinessContext(),
      getCustomerContext(phone),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "ai_instructions")
        .maybeSingle()
        .then(({ data }: { data: { value: unknown } | null }) => (data?.value as any)?.prompt as string | undefined),
    ]);

    const bh = isBusinessHours();
    const hoursNote = bh.open
      ? "A loja está ABERTA agora."
      : `A loja está FECHADA agora. ${bh.message} Se o cliente precisar de algo urgente, informe que um atendente retornará no próximo horário de funcionamento.`;

    const audioNote = respondWithAudio
      ? "\n\nIMPORTANTE: Esta resposta será convertida em ÁUDIO. Seja conciso, conversacional, evite formatação markdown, listas e caracteres especiais."
      : "";

    const systemContent = [
      SYSTEM_PROMPT,
      audioNote,
      `\n--- HORÁRIO ---\n${hoursNote}`,
      `\n--- CONTEXTO DO CATÁLOGO ---\n${businessContext}`,
      customerContext ? `\n${customerContext}` : "",
      aiInstructionsRow ? `\n--- INSTRUÇÕES ADICIONAIS ---\n${aiInstructionsRow}` : "",
    ].join("");

    const groqMessages: any[] = [
      { role: "system", content: systemContent },
      ...history,
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

    // INITIAL CLASSIFICATION STEP
    const classificationRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: 'Classifique a mensagem abaixo em uma categoria:\n- CONFIRMACAO: agradecimentos, "ok", "entendi", "obrigado", "👍", confirmações simples\n- DUVIDA: perguntas, solicitações, reclamações, qualquer coisa que exige resposta\n\nResponda apenas: CONFIRMACAO ou DUVIDA' },
          { role: "user", content: `Mensagem: "${message}"` }
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (classificationRes.ok) {
      const classData = await classificationRes.json();
      const intent = classData.choices?.[0]?.message?.content?.trim()?.toUpperCase();
      
      if (intent === "CONFIRMACAO") {
        console.log("Intent classified as CONFIRMACAO. Skipping main flow.");
        const responseText = "😊";
        const instName = tenantId ? instanceName(tenantId) : "fefo-default";
        
        // Simple text response for confirmations
        const evoRes = await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({ number: phone, text: responseText }),
        });
        const evoData = await evoRes.json();

        // Save to DB
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationId,
          message_id: evoData?.key?.id || null,
          from_me: true,
          type: "text",
          content: responseText,
          status: "sent",
          tenant_id: tenantId,
        });

        return new Response(JSON.stringify({ ok: true, skipped: "confirmation_intent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

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

    // Handle tool calls (supports multiple rounds)
    let toolRounds = 0;
    while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && toolRounds < 3) {
      toolRounds++;
      groqMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        try {
          const args = JSON.parse(toolCall.function.arguments);
          let result: unknown;

          if (fnName === "calcular_frete") {
            result = await executeCalcularFrete(args);
          } else if (fnName === "consultar_ordem_servico") {
            result = await getServiceOrdersByPhone(args.telefone || phone);
          } else {
            result = { error: `Ferramenta desconhecida: ${fnName}` };
          }

          groqMessages.push({
            role: "tool",
            content: typeof result === "string" ? result : JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        } catch (err) {
          groqMessages.push({
            role: "tool",
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Erro ao executar ferramenta",
            }),
            tool_call_id: toolCall.id,
          });
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
            tools: toolDefinitions,
            tool_choice: "auto",
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

    const instName = tenantId ? instanceName(tenantId) : "fefo-default";
    let evoData: any;
    let sentAsAudio = false;

    // If respondWithAudio, convert to speech and send as audio
    if (respondWithAudio) {
      try {
        console.log("Converting AI response to audio via ElevenLabs...");
        const audioBase64 = await textToSpeechBase64(responseText);

        const evoRes = await fetch(
          `${EVOLUTION_BASE}/message/sendMedia/${instName}`,
          {
            method: "POST",
            headers: evoHeaders(),
            body: JSON.stringify({
              number: phone,
              mediatype: "audio",
              media: `data:audio/mpeg;base64,${audioBase64}`,
              mimetype: "audio/mpeg",
              fileName: "audio.mp3",
            }),
          }
        );

        evoData = await evoRes.json();
        console.log(`Evolution sendMedia (audio) status=${evoRes.status}`);

        if (evoRes.ok) {
          sentAsAudio = true;
        } else {
          console.error("Evolution sendMedia failed, falling back to text:", JSON.stringify(evoData));
        }
      } catch (ttsErr) {
        console.error("ElevenLabs TTS failed, falling back to text:", ttsErr);
      }
    }

    // Fallback to text or if not audio mode
    if (!sentAsAudio) {
      const evoRes = await fetch(
        `${EVOLUTION_BASE}/message/sendText/${instName}`,
        {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({ number: phone, text: responseText }),
        }
      );
      evoData = await evoRes.json();
    }

    // Save AI message to DB
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      message_id: evoData?.key?.id || null,
      from_me: true,
      type: sentAsAudio ? "audio" : "text",
      content: sentAsAudio ? `🔊 ${responseText}` : responseText,
      status: "sent",
      tenant_id: tenantId,
    });

    // Update conversation
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message: sentAsAudio ? "🔊 Áudio enviado" : responseText,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ ok: true, response: responseText, sentAsAudio }),
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
