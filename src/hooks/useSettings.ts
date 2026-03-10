import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CardTaxes {
  credit_tax: number;
  debit_tax: number;
}

const SETTINGS_KEY = ["settings"];

export function useCardTaxes() {
  return useQuery({
    queryKey: [...SETTINGS_KEY, "card_taxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "card_taxes")
        .single();
      if (error) throw error;
      return (data.value as any) as CardTaxes;
    },
  });
}

export function useUpdateCardTaxes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taxes: CardTaxes) => {
      const { error } = await supabase
        .from("settings")
        .update({ value: taxes as any, updated_at: new Date().toISOString() })
        .eq("key", "card_taxes");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
