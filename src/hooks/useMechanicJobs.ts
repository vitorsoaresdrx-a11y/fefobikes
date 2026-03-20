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

export interface FinalizePayload {
  jobId: string;
  totalValue: number;
  paymentMethod: string; // 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito'
  customerName?: string | null;
  customerWhatsapp?: string | null;
  customerCpf?: string | null;
  customerId?: string | null;
  bikeName?: string | null;
  problem?: string;
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

      const { data: payData, error: payErr } = await supabase
        .from("os_pagamentos" as any)
        .select("*");
      if (payErr) console.warn("os_pagamentos table might not exist yet:", payErr);

      const { data: osAdicionaisData, error: osAdErr } = await supabase
        .from("os_adicionais" as any)
        .select("*")
        .neq("status", "rascunho");

      const addMap = new Map<string, MechanicJobAddition[]>();
      
      // Load V1 Additions
      (additions as unknown as MechanicJobAddition[]).forEach((a) => {
        if (!addMap.has(a.job_id)) addMap.set(a.job_id, []);
        addMap.get(a.job_id)!.push(a);
      });

      // Load V2 Additions (os_adicionais)
      (osAdicionaisData || []).forEach((a: any) => {
        if (!addMap.has(a.os_id)) addMap.set(a.os_id, []);
        
        let approval: "pending" | "accepted" | "refused" = "pending";
        if (a.status === "aprovado") approval = "accepted";
        if (a.status === "negado") approval = "refused";

        const dbTotal = a.valor_total || 0;
        const partsTotal = (a.pecas || []).reduce(
          (sum: number, p: any) => sum + (p.quantidade || p.quantity || 0) * (p.valor || p.unit_price || 0),
          0
        );
        const labor = Math.max(0, dbTotal - partsTotal);

        addMap.get(a.os_id)!.push({
          id: a.id,
          job_id: a.os_id,
          problem: a.observacoes || "",
          price: dbTotal,
          labor_cost: labor, // Calculate backward so the UI gets logic properly
          parts_used: a.pecas || [],
          approval,
          created_at: a.criado_em || new Date().toISOString(),
          is_v2: true, // Flag to identify which table to update!
        } as MechanicJobAddition & { is_v2: boolean });
      });

      const payMap = new Map<string, any>();
      (payData || []).forEach((p: any) => payMap.set(p.os_id, p));

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "os_adicionais" },
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
          os_id: (data as any).id,
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
          : null; // "ready" -> must use useFinalizeJob instead
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

export function useFinalizeJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FinalizePayload) => {
      const { jobId, totalValue, paymentMethod, customerName, customerWhatsapp, customerCpf, customerId, bikeName, problem } = payload;

      // 1. Mark OS as delivered
      const { error: jobErr } = await supabase
        .from("mechanic_jobs" as any)
        .update({ status: "delivered" })
        .eq("id", jobId);
      if (jobErr) throw jobErr;

      // 2. Upsert payment record in os_pagamentos (full payment at finalization)
      const { data: existingPay } = await supabase
        .from("os_pagamentos" as any)
        .select("id")
        .eq("os_id", jobId)
        .maybeSingle();

      if (existingPay) {
        await supabase.from("os_pagamentos" as any)
          .update({ tipo: 'integral', valor_total: totalValue, valor_pago: totalValue, valor_restante: 0 })
          .eq("os_id", jobId);
      } else {
        await supabase.from("os_pagamentos" as any)
          .insert({ os_id: jobId, tipo: 'integral', valor_total: totalValue, valor_pago: totalValue, valor_restante: 0 });
      }

      // 3. Upsert customer if we have name + whatsapp
      let resolvedCustomerId = customerId || null;
      if (!resolvedCustomerId && (customerName || customerWhatsapp)) {
        const phone = (customerWhatsapp || "").replace(/\D/g, "");
        // Try find by phone first
        if (phone.length >= 10) {
          const { data: existCust } = await supabase
            .from("customers" as any)
            .select("id")
            .ilike("whatsapp", `%${phone.slice(-10)}%`)
            .maybeSingle();
          if (existCust) {
            resolvedCustomerId = (existCust as any).id;
          }
        }
        // If still not found, create
        if (!resolvedCustomerId && customerName) {
          const { data: newCust } = await supabase
            .from("customers" as any)
            .insert({ name: customerName, whatsapp: customerWhatsapp || null, cpf: customerCpf || null })
            .select("id")
            .single();
          resolvedCustomerId = (newCust as any)?.id || null;
        }
      }

      // 4. Create a sale record for DRE + Histórico
      const { data: sale, error: saleErr } = await supabase
        .from("sales" as any)
        .insert({
          customer_id: resolvedCustomerId,
          total: totalValue,
          payment_method: paymentMethod,
          notes: `OS Oficina${bikeName ? ` — ${bikeName}` : ""}${problem ? `: ${problem.slice(0, 80)}` : ""}`,
          card_fee: 0,
          card_tax_percent: 0,
          responsible_name: null,
          origin: 'oficina',
          mechanic_job_id: jobId,
        })
        .select("id")
        .single();
      if (saleErr) console.warn("Could not create sale for OS:", saleErr);

      // 5. Also update customer_id on the mechanic_job itself
      if (resolvedCustomerId && !customerId) {
        await supabase.from("mechanic_jobs" as any)
          .update({ customer_id: resolvedCustomerId })
          .eq("id", jobId);
      }

      return { success: true, saleId: (sale as any)?.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
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
    mutationFn: async ({ id, approval, is_v2 }: { id: string; approval: "accepted" | "refused", is_v2?: boolean }) => {
      if (is_v2) {
        const status = approval === "accepted" ? "aprovado" : "negado";
        const { error } = await supabase
          .from("os_adicionais" as any)
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mechanic_job_additions" as any)
          .update({ approval })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, problem, price, labor_cost, parts_used, is_v2 }: {
      id: string;
      problem: string;
      price: number;
      labor_cost: number;
      parts_used: AdditionPart[];
      is_v2?: boolean;
    }) => {
      if (is_v2) {
        const { error } = await supabase
          .from("os_adicionais" as any)
          .update({
            observacoes: problem,
            valor_total: price,
            pecas: parts_used,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
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
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_v2 }: { id: string, is_v2?: boolean }) => {
      if (is_v2) {
        const { error } = await supabase
          .from("os_adicionais" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mechanic_job_additions" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
