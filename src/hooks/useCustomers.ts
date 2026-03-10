import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  cpf: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const CUSTOMERS_KEY = ["customers"];

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: { name: string; whatsapp?: string | null; cpf?: string | null }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });
}

export function useCustomerWithSales(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_sales", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
