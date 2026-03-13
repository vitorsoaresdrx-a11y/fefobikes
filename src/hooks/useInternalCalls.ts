import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface InternalCall {
  id: string;
  message: string;
  created_by: string;
  created_by_name: string;
  target_type: string;
  target_role: string | null;
  target_user_id: string | null;
  tenant_id: string | null;
  created_at: string;
  audio_url: string | null;
  audio_duration: number | null;
}

export interface InternalCallReply {
  id: string;
  call_id: string;
  message: string;
  created_by: string;
  created_by_name: string;
  tenant_id: string | null;
  created_at: string;
}

const CALLS_KEY = ["internal_calls"];
const REPLIES_KEY = ["internal_call_replies"];

export function useInternalCalls() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("internal-calls-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_calls" }, () => {
        qc.invalidateQueries({ queryKey: CALLS_KEY });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_call_replies" }, () => {
        qc.invalidateQueries({ queryKey: CALLS_KEY });
        qc.invalidateQueries({ queryKey: REPLIES_KEY });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: [...CALLS_KEY, userId],
    queryFn: async () => {
      const { data: calls } = await supabase
        .from("internal_calls")
        .select("*")
        .order("created_at", { ascending: false });

      if (!calls || calls.length === 0) return [];

      const { data: views } = await supabase
        .from("internal_call_views")
        .select("call_id")
        .eq("user_id", userId!);

      const viewedIds = new Set((views || []).map((v: any) => v.call_id));

      return (calls as unknown as InternalCall[]).filter((call) => {
        if (viewedIds.has(call.id)) return false;
        if (call.target_type === "all") return true;
        if (call.target_type === "user") return call.target_user_id === userId;
        if (call.target_type === "role") return true;
        return true;
      });
    },
    enabled: !!userId,
    refetchInterval: 10_000,
  });
}

export function useAllCalls() {
  const { session } = useAuth();

  return useQuery({
    queryKey: [...CALLS_KEY, "all"],
    queryFn: async () => {
      const { data: calls } = await supabase
        .from("internal_calls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!calls) return [];

      const callIds = calls.map((c: any) => c.id);

      // Get view counts
      const { data: views } = await supabase
        .from("internal_call_views")
        .select("call_id");

      const viewCounts: Record<string, number> = {};
      (views || []).forEach((v: any) => {
        viewCounts[v.call_id] = (viewCounts[v.call_id] || 0) + 1;
      });

      // Get replies
      const { data: replies } = await supabase
        .from("internal_call_replies")
        .select("*")
        .in("call_id", callIds)
        .order("created_at", { ascending: true });

      const repliesMap: Record<string, InternalCallReply[]> = {};
      (replies || []).forEach((r: any) => {
        if (!repliesMap[r.call_id]) repliesMap[r.call_id] = [];
        repliesMap[r.call_id].push(r as InternalCallReply);
      });

      return (calls as unknown as InternalCall[]).map((call) => ({
        ...call,
        viewCount: viewCounts[call.id] || 0,
        replies: repliesMap[call.id] || [],
      }));
    },
    enabled: !!session?.user?.id,
  });
}

export function useCallReplies(callId: string | null) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...REPLIES_KEY, callId],
    queryFn: async () => {
      const { data } = await supabase
        .from("internal_call_replies")
        .select("*")
        .eq("call_id", callId!)
        .order("created_at", { ascending: true });

      // Filter out replies created by the current user
      return ((data || []) as unknown as InternalCallReply[]).filter(
        (r) => r.created_by !== userId
      );
    },
    enabled: !!callId && !!userId,
    refetchInterval: 10_000,
  });
}

export function useSendReply() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, message }: { callId: string; message: string }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session!.user.id)
        .single();

      const { error } = await supabase.from("internal_call_replies").insert({
        call_id: callId,
        message,
        created_by: session!.user.id,
        created_by_name: profile?.full_name || session!.user.email || "Usuário",
      });
      if (error) throw error;
    },
    retry: 2,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CALLS_KEY });
      qc.invalidateQueries({ queryKey: REPLIES_KEY });
    },
  });
}

export function useMarkAsViewed() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase.from("internal_call_views").insert({
        call_id: callId,
        user_id: session!.user.id,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    retry: 2,
    onSuccess: () => qc.invalidateQueries({ queryKey: CALLS_KEY }),
  });
}

export function useSendCall() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message,
      targetType,
      targetRole,
      targetUserId,
      audioBlob,
      audioDuration,
    }: {
      message: string;
      targetType: string;
      targetRole?: string;
      targetUserId?: string;
      audioBlob?: Blob;
      audioDuration?: number;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session!.user.id)
        .single();

      let audioUrl: string | null = null;

      if (audioBlob) {
        const fileName = `calls/${crypto.randomUUID()}.webm`;
        const { data, error: uploadError } = await supabase.storage
          .from("internal-calls")
          .upload(fileName, audioBlob, { contentType: "audio/webm" });

        if (!uploadError && data) {
          const { data: urlData } = supabase.storage
            .from("internal-calls")
            .getPublicUrl(data.path);
          audioUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("internal_calls").insert({
        message: message || "",
        created_by: session!.user.id,
        created_by_name: profile?.full_name || session!.user.email || "Usuário",
        target_type: targetType,
        target_role: targetRole || null,
        target_user_id: targetUserId || null,
        audio_url: audioUrl,
        audio_duration: audioDuration || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CALLS_KEY }),
  });
}
