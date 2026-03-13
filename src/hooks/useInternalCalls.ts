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
}

const CALLS_KEY = ["internal_calls"];

export function useInternalCalls() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("internal-calls-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_calls" }, () => {
        qc.invalidateQueries({ queryKey: CALLS_KEY });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: [...CALLS_KEY, userId],
    queryFn: async () => {
      // Get all calls for this tenant
      const { data: calls } = await supabase
        .from("internal_calls")
        .select("*")
        .order("created_at", { ascending: false });

      if (!calls || calls.length === 0) return [];

      // Get views by this user
      const { data: views } = await supabase
        .from("internal_call_views")
        .select("call_id")
        .eq("user_id", userId!);

      const viewedIds = new Set((views || []).map((v: any) => v.call_id));

      // Filter: not viewed + target matches
      return (calls as unknown as InternalCall[]).filter((call) => {
        if (viewedIds.has(call.id)) return false;
        if (call.target_type === "all") return true;
        if (call.target_type === "user") return call.target_user_id === userId;
        if (call.target_type === "role") return true; // roles not enforced at DB level, show all for now
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

      // Get view counts for each call
      const { data: views } = await supabase
        .from("internal_call_views")
        .select("call_id");

      const viewCounts: Record<string, number> = {};
      (views || []).forEach((v: any) => {
        viewCounts[v.call_id] = (viewCounts[v.call_id] || 0) + 1;
      });

      return (calls as unknown as InternalCall[]).map((call) => ({
        ...call,
        viewCount: viewCounts[call.id] || 0,
      }));
    },
    enabled: !!session?.user?.id,
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
    }: {
      message: string;
      targetType: string;
      targetRole?: string;
      targetUserId?: string;
    }) => {
      // Get user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session!.user.id)
        .single();

      const { error } = await supabase.from("internal_calls").insert({
        message,
        created_by: session!.user.id,
        created_by_name: profile?.full_name || session!.user.email || "Usuário",
        target_type: targetType,
        target_role: targetRole || null,
        target_user_id: targetUserId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CALLS_KEY }),
  });
}
