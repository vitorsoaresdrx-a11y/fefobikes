import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdditionPart {
  part_id: string | null;
  part_name: string;
  quantity: number;
  unit_price: number;
}

export interface MechanicJobAddition {
  id: string;
  job_id: string;
  problem: string;
  price: number;
  labor_cost: number;
  parts_used: AdditionPart[];
  approval: "pending" | "accepted" | "refused";
  created_at: string;
}

export interface MechanicJob {
  id: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_whatsapp: string | null;
  customer_id: string | null;
  bike_name: string | null;
  problem: string;
  price: number;
  status: "in_approval" | "in_repair" | "in_maintenance" | "in_analysis" | "ready";
  created_at: string;
  updated_at: string;
  additions?: MechanicJobAddition[];
}

const KEY = ["mechanic_jobs"];

export function useMechanicJobs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("mechanic_jobs" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: additions, error: addErr } = await supabase
        .from("mechanic_job_additions" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (addErr) throw addErr;

      const addMap = new Map<string, MechanicJobAddition[]>();
      (additions as unknown as MechanicJobAddition[]).forEach((a) => {
        if (!addMap.has(a.job_id)) addMap.set(a.job_id, []);
        addMap.get(a.job_id)!.push(a);
      });

      return (jobs as unknown as MechanicJob[]).map((j) => ({
        ...j,
        additions: addMap.get(j.id) || [],
      }));
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
      customer_id?: string | null;
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
            ? "in_analysis"
            : status === "in_analysis"
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

export function useRetreatMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .update({ status: "in_maintenance" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateMechanicJobDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      customer_name?: string | null;
      customer_cpf?: string | null;
      customer_whatsapp?: string | null;
      customer_id?: string | null;
      bike_name?: string | null;
      problem?: string;
      price?: number;
    }) => {
      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .update(updates)
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

export function useCreateAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addition: {
      job_id: string;
      problem: string;
      price: number;
      labor_cost?: number;
      parts_used?: AdditionPart[];
    }) => {
      const { data, error } = await supabase
        .from("mechanic_job_additions" as any)
        .insert({
          ...addition,
          parts_used: JSON.stringify(addition.parts_used || []),
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MechanicJobAddition;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAdditionApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approval }: { id: string; approval: "accepted" | "refused" }) => {
      const { error } = await supabase
        .from("mechanic_job_additions" as any)
        .update({ approval })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
