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

function normalizeQrCode(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const cleaned = trimmed.replace(/^base64,?/i, "");
  return `data:image/png;base64,${cleaned}`;
}

function normalizeQrPayload(payload: unknown): { qrCode?: string; value?: string; error?: string } {
  if (typeof payload === "string") {
    return { qrCode: normalizeQrCode(payload) };
  }

  if (!payload || typeof payload !== "object") {
    return {};
  }

  const data = payload as Record<string, unknown>;
  const candidate = data.qrCode ?? data.qrcode ?? data.value ?? data.base64 ?? data.image;

  return {
    qrCode: normalizeQrCode(candidate),
    value: typeof data.value === "string" ? data.value : undefined,
    error: typeof data.error === "string" ? data.error : undefined,
  };
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
    staleTime: 1000 * 60 * 2,
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
      const payload = await res.json();
      return normalizeQrPayload(payload);
    },
    enabled,
    staleTime: 1000 * 60 * 2,
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
