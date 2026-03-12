import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on parts and bike_models tables
 * and invalidates React Query cache so all devices see updated stock.
 */
export function useRealtimeStock() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("stock-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["parts"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bike_models" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bike_models"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
