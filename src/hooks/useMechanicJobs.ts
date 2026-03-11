import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MechanicJob {
  id: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_whatsapp: string | null;
  bike_name: string | null;
  problem: string;
  price: number;
  status: "in_repair" | "in_maintenance" | "ready";
  created_at: string;
  updated_at: string;
}

const KEY = ["mechanic_jobs"];

export function useMechanicJobs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mechanic_jobs" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as MechanicJob[];
    },
  });
}

export function useCreateMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: {
      customer_name?: string;
      customer_cpf?: string;
      customer_whatsapp?: string;
      bike_name?: string;
      problem: string;
      price: number;
    }) => {
      const { data, error } = await supabase
        .from("mechanic_jobs" as any)
        .insert(job)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MechanicJob;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAdvanceMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const nextStatus =
        status === "in_repair"
          ? "in_maintenance"
          : status === "in_maintenance"
            ? "ready"
            : null;
      if (!nextStatus) throw new Error("Already at final status");
      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .update({ status: nextStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
