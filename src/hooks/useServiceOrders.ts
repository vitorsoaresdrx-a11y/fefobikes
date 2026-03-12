import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceOrder {
  id: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_whatsapp: string | null;
  bike_name: string | null;
  problem: string;
  price: number;
  status: string;
  mechanic_status: string;
  mechanic_name: string | null;
  mechanic_id: string | null;
  frame_number: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const KEY = ["service_orders"];

export function useServiceOrders(statusFilter?: string[]) {
  return useQuery({
    queryKey: [...KEY, statusFilter],
    queryFn: async () => {
      let query = supabase.from("service_orders").select("*").order("created_at", { ascending: false });
      if (statusFilter && statusFilter.length > 0) {
        query = query.in("mechanic_status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceOrder[];
    },
  });
}

export function useCreateServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: {
      customer_name?: string;
      customer_cpf?: string;
      customer_whatsapp?: string;
      bike_name?: string;
      problem: string;
      price?: number;
    }) => {
      const { error } = await supabase.from("service_orders").insert(order);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAcceptServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mechanic_id, mechanic_name }: { id: string; mechanic_id: string; mechanic_name: string }) => {
      const { error } = await supabase
        .from("service_orders")
        .update({ mechanic_status: "accepted", mechanic_id, mechanic_name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useFinishServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, frame_number }: { id: string; frame_number: string }) => {
      const { error } = await supabase
        .from("service_orders")
        .update({
          mechanic_status: "done",
          frame_number,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useServiceOrdersRealtime(onDone?: (order: ServiceOrder) => void) {
  const qc = useQueryClient();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const channel = supabase
      .channel("service_orders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_orders" },
        (payload) => {
          qc.invalidateQueries({ queryKey: KEY });
          if (
            payload.eventType === "UPDATE" &&
            (payload.new as any).mechanic_status === "done" &&
            onDoneRef.current
          ) {
            onDoneRef.current(payload.new as ServiceOrder);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
