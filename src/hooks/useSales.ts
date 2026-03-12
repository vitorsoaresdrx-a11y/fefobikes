import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SaleItem {
  description: string;
  quantity: number;
  unit_price: number;
  bike_model_id?: string | null;
  part_id?: string | null;
}

export interface CreateSalePayload {
  customer_id: string | null;
  total: number;
  payment_method: string | null;
  notes: string | null;
  items: SaleItem[];
  card_fee: number;
  card_tax_percent: number;
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      const { items, ...saleData } = payload;
      const { data: sale, error } = await supabase
        .from("sales")
        .insert(saleData)
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const rows = items.map((item) => ({ ...item, sale_id: sale.id }));
        const { error: itemsError } = await supabase.from("sale_items").insert(rows);
        if (itemsError) throw itemsError;
      }

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, customer_id, total, payment_method, card_fee, card_tax_percent, notes, sale_items(id, description, quantity, unit_price, part_id, bike_model_id), customers(id, name, whatsapp, cpf)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
