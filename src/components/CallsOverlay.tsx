import { useEffect, useRef, useState } from "react";
import { useInternalCalls, useMarkAsViewed } from "@/hooks/useInternalCalls";
import { Bell, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export function CallsOverlay() {
  const { data: pendingCalls = [], refetch } = useInternalCalls();
  const { mutateAsync: markAsViewed } = useMarkAsViewed();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const visibleCalls = pendingCalls.filter((c) => !dismissedIds.has(c.id));

  useEffect(() => {
    if (visibleCalls.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const playBeep = () => {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch {
        // ignore
      }
    };

    playBeep();
    intervalRef.current = setInterval(playBeep, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visibleCalls.length]);

  const handleMarkAsViewed = async (callId: string) => {
    if (loadingIds.has(callId)) return;

    // Optimistically dismiss
    setDismissedIds((prev) => new Set(prev).add(callId));
    setLoadingIds((prev) => new Set(prev).add(callId));

    try {
      await markAsViewed(callId);
      // Force refetch to sync state
      await refetch();
    } catch {
      // Revert optimistic dismiss on failure
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  };

  if (visibleCalls.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto">
      <AnimatePresence>
        {visibleCalls.map((call, i) => (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: i * 0.1 }}
            className="w-full max-w-sm bg-zinc-950 border border-destructive/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center animate-pulse">
                <Bell size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-destructive">Chamada</p>
                <p className="text-[10px] text-muted-foreground">
                  {call.created_by_name} · {format(new Date(call.created_at), "HH:mm")}
                </p>
              </div>
            </div>

            {/* Message */}
            <p className="text-base font-bold text-foreground leading-relaxed mb-5">
              {call.message}
            </p>

            {/* Mark as viewed */}
            <button
              onClick={() => handleMarkAsViewed(call.id)}
              disabled={loadingIds.has(call.id)}
              className="w-full h-11 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-black transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingIds.has(call.id) ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              Marcar como visto
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
