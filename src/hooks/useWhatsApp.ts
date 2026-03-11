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

export function useConversations(statusFilter?: string) {
  const qc = useQueryClient();

  // Realtime subscription
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
    queryKey: [...CONVERSATIONS_KEY, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return useQuery({
    queryKey: [...MESSAGES_KEY, conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
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
    }: {
      phone: string;
      message: string;
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "zapi-send-message",
        { body: { phone, message, conversationId } }
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
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
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

export function useTotalUnread() {
  return useQuery({
    queryKey: [...CONVERSATIONS_KEY, "total_unread"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("unread_count");
      if (error) throw error;
      return (data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
    },
  });
}
