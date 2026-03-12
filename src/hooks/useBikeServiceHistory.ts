import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BikeServiceRecord {
  id: string;
  frame_number: string;
  bike_name: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_phone: string | null;
  problem: string;
  mechanic_id: string | null;
  mechanic_name: string | null;
  service_order_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface GroupedBikeHistory {
  frame_number: string;
  bike_name: string;
  records: BikeServiceRecord[];
}

const KEY = ["bike_service_history"];

export function useBikeServiceHistory() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_service_history")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by frame_number
      const map = new Map<string, GroupedBikeHistory>();
      for (const record of data as BikeServiceRecord[]) {
        const existing = map.get(record.frame_number);
        if (existing) {
          existing.records.push(record);
        } else {
          map.set(record.frame_number, {
            frame_number: record.frame_number,
            bike_name: record.bike_name,
            records: [record],
          });
        }
      }
      return Array.from(map.values());
    },
  });
}

export function useCreateBikeServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      frame_number: string;
      bike_name: string;
      customer_name?: string;
      customer_cpf?: string;
      customer_phone?: string;
      problem: string;
      mechanic_id?: string;
      mechanic_name?: string;
      service_order_id?: string;
      status?: string;
      completed_at?: string;
    }) => {
      const { error } = await supabase.from("bike_service_history").insert(record);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
