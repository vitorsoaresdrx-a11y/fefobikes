import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_photo: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
  ai_enabled: boolean;
  human_takeover: boolean;
  instance_name: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  message_id: string | null;
  from_me: boolean;
  type: string;
  content: string;
  media_url: string | null;
  status: string;
  created_at: string;
}

const CONVERSATIONS_KEY = ["whatsapp_conversations"];
const MESSAGES_KEY = ["whatsapp_messages"];

export function useConversations(statusFilter?: string, instanceName?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp_conversations_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => {
          qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: [...CONVERSATIONS_KEY, statusFilter, instanceName],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_conversations")
        .select("id, contact_phone, contact_name, contact_photo, last_message, last_message_at, unread_count, status, ai_enabled, human_takeover, instance_name, created_at")
        .order("last_message_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (instanceName) {
        query = query.eq("instance_name", instanceName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Conversation[]).filter((conversation) => {
        const normalizedPhone = (conversation.contact_phone || "").replace(/\D/g, "");
        return normalizedPhone.length >= 8;
      });
    },
  });
}

export function useMessages(conversationId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`whatsapp_messages_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, conversationId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, conversationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return useQuery({
    queryKey: [...MESSAGES_KEY, conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id, conversation_id, message_id, from_me, type, content, media_url, status, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const reversed = (data as Message[]).reverse();
      return reversed.filter((msg) => {
        const isGhostStatusMessage =
          msg.type === "text" &&
          !msg.message_id &&
          !msg.media_url &&
          (!msg.content || msg.content === "[text]" || msg.content === "text");
        return !isGhostStatusMessage;
      });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      phone,
      message,
      conversationId,
      sendAsAudio,
      instanceName,
    }: {
      phone: string;
      message: string;
      conversationId?: string;
      sendAsAudio?: boolean;
      instanceName?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "zapi-send-message",
        { body: { phone, message, conversationId, sendAsAudio, instanceName } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
  });
}

export function useUpdateConversationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useToggleAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ai_enabled }: { id: string; ai_enabled: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ ai_enabled, human_takeover: !ai_enabled })
        .eq("id", id);
      if (error) throw error;

      if (!ai_enabled) {
        try {
          const { data: msgs } = await supabase
            .from("whatsapp_messages")
            .select("content, from_me, type")
            .eq("conversation_id", id)
            .order("created_at", { ascending: false })
            .limit(15);

          if (msgs && msgs.length > 0) {
            const conversation = msgs
              .reverse()
              .filter((m) => m.type === "text" && m.content && !m.content.startsWith("📋"))
              .map((m) => {
                const cleanContent = m.content.replace(/^🎤 /, "").replace(/^🔊 /, "");
                return `${m.from_me ? "IA" : "Cliente"}: ${cleanContent}`;
              })
              .join("\n");

            const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
              "generate-handoff-summary",
              {
                body: {
                  conversationId: id,
                  conversation,
                },
              }
            );

            let finalSummary: string;

            if (summaryError || !summaryData?.summary) {
              console.error("Failed to generate AI summary, using fallback:", summaryError);
              finalSummary = `📋 *Resumo da conversa (IA → Humano):*\n\n${conversation}\n\n_IA desativada. Atendente humano assumiu._`;
            } else {
              finalSummary = `📋 *Resumo da conversa (IA → Humano):*\n\n${summaryData.summary}\n\n_IA desativada. Atendente humano assumiu._`;
            }

            // Remove resumo anterior antes de inserir o novo
            await supabase
              .from("whatsapp_messages")
              .delete()
              .eq("conversation_id", id)
              .eq("status", "internal");

            await supabase.from("whatsapp_messages").insert({
              conversation_id: id,
              from_me: true,
              type: "text",
              content: finalSummary,
              status: "internal",
            });
          }
        } catch (e) {
          console.error("Failed to generate handoff summary:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
  });
}

export function useTotalUnread() {
  return useQuery({
    queryKey: [...CONVERSATIONS_KEY, "total_unread"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("unread_count, contact_phone");
      if (error) throw error;
      return (data || []).reduce((sum, c) => {
        const normalizedPhone = (c.contact_phone || "").replace(/\D/g, "");
        if (normalizedPhone.length < 8) return sum;
        return sum + (c.unread_count || 0);
      }, 0);
    },
  });
}
