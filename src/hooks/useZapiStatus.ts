import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STATUS_KEY = ["zapi_status"];

export function useZapiConnectionStatus() {
  return useQuery({
    queryKey: [...STATUS_KEY, "status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("zapi-status", {
        body: null,
        method: "GET",
        headers: {},
      });
      // The zapi-status function uses query params; we call with ?action=status
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=status`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to check status");
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
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=qr-code`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to get QR code");
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
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=disconnect`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATUS_KEY });
    },
  });
}
