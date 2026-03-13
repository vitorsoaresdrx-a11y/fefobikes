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

// ─── Station Logins ──────────────────────────────────────────────────────────

export interface StationLogins {
  admin: string;
  salao: string;
  mecanica: string;
}

export function useStationLogins() {
  return useQuery({
    queryKey: [...SETTINGS_KEY, "station_logins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "station_logins")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as any as StationLogins) || { admin: "", salao: "", mecanica: "" };
    },
  });
}

export function useUpdateStationLogins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logins: StationLogins) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "station_logins")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: logins as any, updated_at: new Date().toISOString() })
          .eq("key", "station_logins");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: "station_logins", value: logins as any });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

// ─── Salão Names ─────────────────────────────────────────────────────────────

export function useSalaoNames() {
  return useQuery({
    queryKey: [...SETTINGS_KEY, "salao_names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "salao_names")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as string[]) || [];
    },
  });
}

export function useUpdateSalaoNames() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "salao_names")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: names as any, updated_at: new Date().toISOString() })
          .eq("key", "salao_names");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: "salao_names", value: names as any });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
