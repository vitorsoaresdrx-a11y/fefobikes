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

// ─── Station Passwords ───────────────────────────────────────────────────────

export interface StationPasswords {
  admin: string;
  salao: string;
  mecanica: string;
}

export function useStationPasswords() {
  return useQuery({
    queryKey: [...SETTINGS_KEY, "station_passwords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "station_passwords")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as any as StationPasswords) || { admin: "", salao: "", mecanica: "" };
    },
  });
}

export function useUpdateStationPasswords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (passwords: StationPasswords) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "station_passwords")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: passwords as any, updated_at: new Date().toISOString() })
          .eq("key", "station_passwords");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: "station_passwords", value: passwords as any });
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
