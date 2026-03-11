import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STATUS_KEY = ["zapi_status"];

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

function zapiUrl(action: string) {
  return `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=${action}`;
}

export function useZapiConnectionStatus() {
  return useQuery({
    queryKey: [...STATUS_KEY, "status"],
    queryFn: async () => {
      const res = await fetch(zapiUrl("status"), { headers: await getAuthHeaders() });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Status check failed: ${text}`);
      }
      return res.json() as Promise<{ connected?: boolean; smartphoneConnected?: boolean; error?: string }>;
    },
    refetchInterval: 15000,
    retry: 1,
  });
}

export function useZapiQrCode(enabled: boolean) {
  return useQuery({
    queryKey: [...STATUS_KEY, "qr"],
    queryFn: async () => {
      const res = await fetch(zapiUrl("qr-code"), { headers: await getAuthHeaders() });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`QR code failed: ${text}`);
      }
      return res.json() as Promise<{ qrCode?: string; value?: string; error?: string }>;
    },
    enabled,
    refetchInterval: enabled ? 20000 : false,
    retry: 1,
  });
}

export function useZapiDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(zapiUrl("disconnect"), { headers: await getAuthHeaders() });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Disconnect failed: ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATUS_KEY });
    },
  });
}
