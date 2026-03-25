import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/** Download audio from Evolution API and transcribe via Groq Whisper */
async function transcribeAudio(instName: string, messageId: string, remoteJid: string): Promise<string> {
  // Download media as base64 from Evolution
  const mediaRes = await fetch(
    `${EVOLUTION_BASE}/chat/getBase64FromMediaMessage/${instName}`,
    {
      method: "POST",
      headers: evoHeaders(),
      body: JSON.stringify({
        message: { key: { id: messageId, remoteJid } },
        convertToMp4: false,
      }),
    }
  );

  if (!mediaRes.ok) {
    const errText = await mediaRes.text();
    console.error("Evolution getBase64 error:", mediaRes.status, errText);
    throw new Error(`Failed to download media: ${mediaRes.status}`);
  }

  const mediaData = await mediaRes.json();
  const base64Audio = mediaData.base64 || mediaData.mediaBase64 || mediaData.data;

  if (!base64Audio) {
    console.error("No base64 audio in response:", JSON.stringify(mediaData).slice(0, 200));
    throw new Error("No audio data returned from Evolution");
  }

  // Decode base64 to binary
  const binaryStr = atob(base64Audio.replace(/^data:audio\/[^;]+;base64,/, ""));
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Send to Groq Whisper for transcription
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: "audio/ogg" }), "audio.ogg");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "pt");

  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
  const whisperRes = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!whisperRes.ok) {
    const errText = await whisperRes.text();
    console.error("Groq Whisper error:", whisperRes.status, errText);
    throw new Error(`Whisper transcription failed: ${whisperRes.status}`);
  }

  const whisperData = await whisperRes.json();
  const transcript = whisperData.text?.trim();
  console.log("Transcription result:", transcript);

  if (!transcript) {
    throw new Error("Empty transcription");
  }

  return transcript;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const rawEvent = String(body.event || "").trim();
    const normalizedEvent = rawEvent.toUpperCase().replace(/[.\s-]/g, "_");

    if (normalizedEvent === "CONNECTION_UPDATE") {
      console.log("Connection update:", body.data?.state);
      return new Response(JSON.stringify({ ok: true, event: normalizedEvent.toLowerCase() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedEvent !== "MESSAGES_UPSERT") {
      return new Response(JSON.stringify({ ok: true, ignored: rawEvent || "unknown_event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgData = body.data;
    if (!msgData) {
      return new Response(JSON.stringify({ ok: true, ignored: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = msgData.key || {};
    const isFromMe = key.fromMe === true;
    const remoteJid = key.remoteJid || "";

    if (remoteJid.includes("status@broadcast") || remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ ok: true, ignored: "broadcast_or_group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
    const messageId = key.id || "";

    const messageObj = msgData.message || {};
    let content = "";
    let type = "text";
    let mediaUrl: string | null = null;

    if (messageObj.conversation) {
      content = messageObj.conversation;
    } else if (messageObj.extendedTextMessage?.text) {
      content = messageObj.extendedTextMessage.text;
    } else if (messageObj.imageMessage) {
      type = "image";
      content = messageObj.imageMessage.caption || "[image]";
      mediaUrl = messageObj.imageMessage.url || null;
    } else if (messageObj.audioMessage) {
      type = "audio";
      content = "[audio]";
      mediaUrl = messageObj.audioMessage.url || null;
    } else if (messageObj.documentMessage) {
      type = "document";
      content = messageObj.documentMessage.fileName || "[document]";
      mediaUrl = messageObj.documentMessage.url || null;
    } else if (messageObj.videoMessage) {
      type = "document";
      content = messageObj.videoMessage.caption || "[video]";
      mediaUrl = messageObj.videoMessage.url || null;
    }

    if (!phone || (!content && !mediaUrl)) {
      return new Response(JSON.stringify({ ok: true, ignored: "empty_payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    let convId: string | null = null;
    const pushName = msgData.pushName || null;
    const contactName = pushName;

    if (isFromMe) {
      const { data: byPhone } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", phone)
        .maybeSingle();

      if (!byPhone) {
        return new Response(JSON.stringify({ ok: true, ignored: "from_me_no_conv" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      convId = byPhone.id;

      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: content || `[${type}]`,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);

      await supabase.from("whatsapp_messages").insert({
        conversation_id: convId,
        message_id: messageId,
        from_me: true,
        type,
        content: content || `[${type}]`,
        media_url: mediaUrl,
        status: "sent",
        tenant_id: tenantId,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Incoming message ---
    const { data: existing } = await supabase
      .from("whatsapp_conversations")
      .select("id, unread_count")
      .eq("contact_phone", phone)
      .maybeSingle();

    if (existing) {
      convId = existing.id;

      const updates: Record<string, unknown> = {
        last_message: content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: (existing.unread_count || 0) + 1,
      };
      if (contactName) updates.contact_name = contactName;

      await supabase
        .from("whatsapp_conversations")
        .update(updates)
        .eq("id", convId);
    } else {
      const insertData: Record<string, unknown> = {
        contact_phone: phone,
        contact_name: contactName,
        last_message: content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        status: "open",
        tenant_id: tenantId,
      };

      const { data: newConv } = await supabase
        .from("whatsapp_conversations")
        .insert(insertData)
        .select("id")
        .single();

      convId = newConv!.id;
    }

    // Save incoming message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: convId,
      message_id: messageId,
      from_me: false,
      type,
      content: content || `[${type}]`,
      media_url: mediaUrl,
      status: "delivered",
      tenant_id: tenantId,
    });

    // --- Automated Freight Lookup (Robô de Frete) ---
    const AUTHORIZED_PHONES = ["5515996128054", "5515998175561", "5515988351790"];
    const cepMatch = content.match(/\d{5}-?\d{3}/);

    if (cepMatch && AUTHORIZED_PHONES.includes(phone) && !isFromMe) {
      const cleanCep = parseInt(cepMatch[0].replace(/\D/g, ""));
      console.log(`Freight lookup triggered for CEP ${cleanCep} by ${phone}`);

      const { data: rule, error: ruleErr } = await supabase
        .from("frete_tabela_rodonaves")
        .select("*")
        .lte("cep_ini", cleanCep)
        .gte("cep_fim", cleanCep)
        .single();

      if (rule && !ruleErr) {
        const boxVolume = (78 * 20 * 148) / 1000000;
        const pesoTaxado = Math.max(15.5, boxVolume * 300); // 70kg
        const tas = Number(rule.tas);
        const pedagio = Number(rule.pedagio_fixo);

        // --- Multiplicadores FeFo Bikes v3 ---
        const BRAZIL_CAPITALS = ["ARACAJU", "BELEM", "BELO HORIZONTE", "BOA VISTA", "CAMPO GRANDE", "CUIABA", "CURITIBA", "FLORIANOPOLIS", "FORTALEZA", "GOIANIA", "JOAO PESSOA", "MACEIO", "MANAUS", "NATAL", "PALMAS", "PORTO ALEGRE", "PORTO VELHO", "RECIFE", "RIO BRANCO", "RIO DE JANEIRO", "SALVADOR", "SAO LUIS", "SAO PAULO", "TERESINA", "VITORIA", "BRASILIA"];
        const city = rule.cidade.toUpperCase().trim();
        const uf = rule.uf.toUpperCase().trim();
        
        let bucket: 'capital' | 'interior' | 'remoto' = 'interior';
        if (BRAZIL_CAPITALS.includes(city)) bucket = 'capital';
        else if (["AC", "AM", "RO", "RR", "AP", "PA", "TO"].includes(uf)) bucket = 'remoto';
        else if (city.includes("GARRUCHOS")) bucket = 'remoto';

        const MULTIPLIERS = { capital: 1.25, interior: 1.65, remoto: 2.90 };
        const multiplier = MULTIPLIERS[bucket];

        const availableTiers = [
          { w: 100, v: Number(rule.peso100) },
          { w: 60, v: Number(rule.peso60) },
          { w: 40, v: Number(rule.peso40) },
          { w: 20, v: Number(rule.peso20) },
          { w: 10, v: Number(rule.peso10) },
          { w: 5, v: Number(rule.peso5) }
        ].filter(t => t.v > 0);

        const calculatePrice = (bikeVal: number) => {
          if (availableTiers.length === 0) return 0;
          let base = 0;
          const highest = availableTiers[0];
          const match = [...availableTiers].reverse().find(t => t.w >= pesoTaxado);
          
          if (match) base = match.v;
          else base = highest.v + (pesoTaxado - highest.w) * Number(rule.excedente_kg);
          
          const gris = Math.max(Number(rule.gris_min), bikeVal * Number(rule.gris_pct));
          const subtotalCSV = base + gris + tas + pedagio;
          const valorFinal = Math.ceil(subtotalCSV * multiplier);
          
          console.log(`Freight Robot [${bucket}]:`, { city, subtotalCSV, multiplier, valorFinal });
          return valorFinal;
        };

        const totalQuadro = calculatePrice(1000);
        const totalBike = calculatePrice(5000);

        const responseMsg = `Frete FeFo Bikes\n` +
          `Destino: ${rule.cidade}-${rule.uf}\n` +
          `Prazo: ${rule.prazo} dias úteis\n\n` +
          `📦 Quadro: R$ ${totalQuadro.toFixed(2)}\n` +
          `🚲 Bike Completa: R$ ${totalBike.toFixed(2)}`;

        const instName = tenantId ? instanceName(tenantId) : "fefo-default";
        
        try {
          await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
            method: "POST",
            headers: evoHeaders(),
            body: JSON.stringify({ number: phone, text: responseMsg }),
          });

          console.log(`Freight response sent to ${phone}`);
          return new Response(JSON.stringify({ ok: true, source: "freight_robot" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (sendErr) {
          console.error("Error sending freight response:", sendErr);
        }
      } else if (ruleErr) {
        console.error("Freight rule lookup error:", ruleErr);
      }
    }

    // Handle audio: transcribe and respond with audio
    if (type === "audio" && !isFromMe) {
      const instName = tenantId ? instanceName(tenantId) : "fefo-default";

      try {
        const transcript = await transcribeAudio(instName, messageId, remoteJid);

        // Update the saved message content with transcription
        await supabase
          .from("whatsapp_messages")
          .update({ content: `🎤 ${transcript}` })
          .eq("conversation_id", convId)
          .eq("message_id", messageId);

        // Also update conversation last_message
        await supabase
          .from("whatsapp_conversations")
          .update({ last_message: `🎤 ${transcript}` })
          .eq("id", convId);

        // Invoke AI responder with transcribed text, requesting audio response
        supabase.functions.invoke("ai-responder", {
          body: {
            conversationId: convId,
            phone,
            message: transcript,
            respondWithAudio: true,
          },
        }).catch((err: unknown) => console.error("AI responder invoke error:", err));
      } catch (err) {
        console.error("Audio transcription failed:", err);
        // Still try to invoke AI with a fallback
        supabase.functions.invoke("ai-responder", {
          body: {
            conversationId: convId,
            phone,
            message: "[O cliente enviou um áudio que não pôde ser transcrito. Peça para ele repetir por texto.]",
            respondWithAudio: false,
          },
        }).catch((err2: unknown) => console.error("AI responder fallback error:", err2));
      }
    }
    // Handle text: respond with text
    else if (type === "text" && content) {
      supabase.functions.invoke("ai-responder", {
        body: { conversationId: convId, phone, message: content, respondWithAudio: false },
      }).catch((err: unknown) => console.error("AI responder invoke error:", err));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
