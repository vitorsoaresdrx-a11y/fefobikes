import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  status: "in_approval" | "in_repair" | "in_maintenance" | "in_analysis" | "ready" | "delivered";
  created_at: string;
  updated_at: string;
  additions?: MechanicJobAddition[];
  payment?: {
    tipo: 'integral' | 'parcial' | 'nenhum';
    valor_pago: number;
    valor_restante: number;
    valor_total: number;
  } | null;
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

      const { data: payments, error: payErr } = await supabase
        .from("os_pagamentos" as any)
        .select("*");
      if (payErr) console.warn("os_pagamentos table might not exist yet:", payErr);

      const addMap = new Map<string, MechanicJobAddition[]>();
      (additions as unknown as MechanicJobAddition[]).forEach((a) => {
        if (!addMap.has(a.job_id)) addMap.set(a.job_id, []);
        addMap.get(a.job_id)!.push(a);
      });

      const payMap = new Map<string, any>();
      (payments || []).forEach((p: any) => payMap.set(p.os_id, p));

      return (jobs as unknown as MechanicJob[])
        .filter((j) => j.status !== "delivered")
        .map((j) => ({
          ...j,
          additions: addMap.get(j.id) || [],
          payment: payMap.get(j.id) || null,
        }));
    },
  });
}

export function useMechanicJobsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("mechanic_jobs_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mechanic_jobs" },
        () => {
          qc.invalidateQueries({ queryKey: KEY });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mechanic_job_additions" },
        () => {
          qc.invalidateQueries({ queryKey: KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
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
      status?: string;
      payment?: {
        tipo: 'integral' | 'parcial' | 'nenhum';
        valor_pago: number;
      }
    }) => {
      const { payment, ...jobData } = job;
      const { data, error } = await supabase
        .from("mechanic_jobs" as any)
        .insert(jobData)
        .select()
        .single();
      if (error) throw error;
      
      if (payment && payment.tipo !== 'nenhum') {
        const valor_total = job.price;
        const valor_restante = valor_total - payment.valor_pago;
        await supabase.from("os_pagamentos" as any).insert({
          os_id: data.id,
          tipo: payment.tipo,
          valor_total,
          valor_pago: payment.valor_pago,
          valor_restante
        });
      }

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
        status === "in_approval"
          ? "in_repair"
          : status === "in_repair"
          ? "in_maintenance"
          : status === "in_maintenance"
          ? "in_analysis"
          : status === "in_analysis"
          ? "ready"
          : status === "ready"
          ? "delivered"
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
    mutationFn: async ({ id, payment, ...updates }: {
      id: string;
      customer_name?: string | null;
      customer_cpf?: string | null;
      customer_whatsapp?: string | null;
      customer_id?: string | null;
      bike_name?: string | null;
      problem?: string;
      price?: number;
      payment?: {
        tipo: 'integral' | 'parcial' | 'nenhum';
        valor_pago: number;
      }
    }) => {
      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      if (payment) {
        const { data: existing } = await supabase.from("os_pagamentos" as any).select("*").eq("os_id", id).maybeSingle();
        const valor_total = updates.price || 0;
        const valor_restante = valor_total - payment.valor_pago;
        
        if (existing) {
          if (payment.tipo === 'nenhum') {
            // Se mudou para nenhum, deleta o pagamento adiantado do banco para refletir corretamente as badges
            await supabase.from("os_pagamentos" as any).delete().eq("os_id", id);
          } else {
            await supabase.from("os_pagamentos" as any).update({
              tipo: payment.tipo,
              valor_total,
              valor_pago: payment.valor_pago,
              valor_restante
            }).eq("os_id", id);
          }
        } else if (payment.tipo !== 'nenhum') {
          await supabase.from("os_pagamentos" as any).insert({
            os_id: id,
            tipo: payment.tipo,
            valor_total,
            valor_pago: payment.valor_pago,
            valor_restante
          });
        }
      }
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

export function useUpdateAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, problem, price, labor_cost, parts_used }: {
      id: string;
      problem: string;
      price: number;
      labor_cost: number;
      parts_used: AdditionPart[];
    }) => {
      const { error } = await supabase
        .from("mechanic_job_additions" as any)
        .update({
          problem,
          price,
          labor_cost,
          parts_used: JSON.stringify(parts_used),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mechanic_job_additions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
