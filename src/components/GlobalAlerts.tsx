import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { playNotifySound } from "@/lib/sounds";
import { usePermissions } from "@/hooks/usePermissions";

interface Alerta {
  id: string;
  os_id: string;
  numero_cliente: string;
  contexto: string;
  visto: boolean;
  mechanic_jobs?: {
    bike_name?: string;
  };
}

export function GlobalAlerts() {
  const [alerts, setAlerts] = useState<Alerta[]>([]);
  const { canSeeAlerts } = usePermissions();

  // Apenas Salão e Administrador vêem os alertas
  const isTargetProfile = canSeeAlerts;

  useEffect(() => {
    if (!isTargetProfile) return;

    // Buscar alertas ativos inicialmente
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from("os_alertas")
        .select("*, mechanic_jobs(bike_name)")
        .eq("visto", false);

      if (!error && data) {
        setAlerts(data as Alerta[]);
        if (data.length > 0) playNotifySound();
      }
    };

    fetchAlerts();

    // Inscrição Realtime
    const sub = supabase
      .channel("os_alertas_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "os_alertas",
        },
        async (payload) => {
          if (payload.eventType === "INSERT" && !payload.new.visto) {
            playNotifySound();
            const { data } = await supabase
              .from("os_alertas")
              .select("*, mechanic_jobs(bike_name)")
              .eq("id", payload.new.id)
              .single();
            if (data) setAlerts((prev) => [...prev, data as Alerta]);
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.visto) {
              setAlerts((prev) => prev.filter((a) => a.id !== payload.new.id));
            } else {
              // Foi reaberto pelo cron
              playNotifySound();
              const { data } = await supabase
                .from("os_alertas")
                .select("*, mechanic_jobs(bike_name)")
                .eq("id", payload.new.id)
                .single();
              if (data) {
                setAlerts((prev) => {
                  if (prev.find((a) => a.id === data.id)) return prev;
                  return [...prev, data as Alerta];
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [isTargetProfile]);

  const handleMarkAsSeen = async (id: string) => {
    // Removemos do estado otimisticamente
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("os_alertas").update({ visto: true }).eq("id", id);
  };

  if (!isTargetProfile || alerts.length === 0) return null;

  // Renderizamos o alerta mais antigo primeiro (como uma pilha)
  const currentAlert = alerts[0];
  const zapLink = `https://wa.me/${currentAlert.numero_cliente.replace(/\D/g, "")}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-destructive/10 border border-destructive/20 relative w-full max-w-xl rounded-[40px] p-8 md:p-12 overflow-hidden shadow-2xl">
        {/* Background glow effects */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-destructive/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-destructive/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center animate-pulse border border-destructive/30">
            <AlertTriangle size={36} className="text-destructive" />
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
              Atenção
              <br />
              <span className="text-destructive">Necessária</span>
            </h2>
            <p className="text-lg text-white/80 font-medium">
              A bicicleta{" "}
              <strong className="text-white">
                {currentAlert.mechanic_jobs?.bike_name || "Sem Identificação"}
              </strong>{" "}
              requer sua atenção!
            </p>
          </div>

          <div className="bg-black/40 border border-destructive/20 rounded-2xl p-6 w-full text-left space-y-2">
            <p className="text-[10px] font-black text-destructive uppercase tracking-[0.2em]">Contexto do Ocorrido</p>
            <p className="text-white font-bold leading-relaxed">{currentAlert.contexto}</p>
          </div>

          <div className="flex flex-col gap-3 w-full pt-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => handleMarkAsSeen(currentAlert.id)}
                className="flex-1 h-14 rounded-2xl border border-destructive/30 text-white hover:bg-destructive/10 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Check size={16} className="text-destructive" /> Marcar como visto
              </button>
              <a
                href={zapLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-14 rounded-2xl bg-destructive text-white hover:bg-destructive/90 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-destructive/20"
              >
                Falar com Cliente <ExternalLink size={16} />
              </a>
            </div>
            <button
              onClick={async () => {
                setAlerts((prev) => prev.filter((a) => a.id !== currentAlert.id));
                await supabase.from("os_alertas").update({ visto: true, descartado: true }).eq("id", currentAlert.id);
              }}
              className="w-full h-12 rounded-2xl bg-black/40 text-muted-foreground hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              Descartar definitivamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
