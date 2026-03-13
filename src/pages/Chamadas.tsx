import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSendCall, useAllCalls } from "@/hooks/useInternalCalls";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Send, Users, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TARGET_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "role:admin", label: "Admin" },
  { key: "role:balcao", label: "Balcão" },
  { key: "role:mecanica", label: "Mecânica" },
];

export default function Chamadas() {
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState("all");
  const [targetUserId, setTargetUserId] = useState("");
  const { mutateAsync: sendCall, isPending } = useSendCall();
  const { data: history = [] } = useAllCalls();
  const { data: members = [] } = useTenantMembers();

  const handleSend = async () => {
    if (!message.trim()) return;

    let targetType = "all";
    let targetRole: string | undefined;

    if (targetUserId) {
      targetType = "user";
    } else if (selected.startsWith("role:")) {
      targetType = "role";
      targetRole = selected.replace("role:", "");
    }

    try {
      await sendCall({
        message: message.trim(),
        targetType,
        targetRole,
        targetUserId: targetUserId || undefined,
      });
      setMessage("");
      toast.success("Chamada enviada!");
    } catch {
      toast.error("Erro ao enviar chamada");
    }
  };

  const getTargetLabel = (call: any) => {
    if (call.target_type === "all") return "Todos";
    if (call.target_type === "role") return call.target_role;
    if (call.target_type === "user") return "Usuário específico";
    return call.target_type;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bell size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight text-foreground">Chamadas</h1>
          <p className="text-xs text-muted-foreground">Envie alertas para sua equipe</p>
        </div>
      </div>

      {/* New Call */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Enviar para</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TARGET_OPTIONS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setSelected(t.key);
                setTargetUserId("");
              }}
              className={`h-9 rounded-xl text-xs font-bold border transition-all ${
                selected === t.key && !targetUserId
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Specific user */}
        <select
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          className="w-full h-10 rounded-xl bg-secondary border border-border text-sm text-foreground px-3"
        >
          <option value="">Ou selecionar usuário específico...</option>
          {members.map((m) => (
            <option key={m.id} value={m.user_id}>
              {m.email || m.user_id}
            </option>
          ))}
        </select>

        {/* Message */}
        <textarea
          placeholder="Digite a mensagem da chamada..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full h-28 bg-secondary border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:border-primary transition-colors"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || isPending}
          className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Send size={16} />
          Enviar Chamada
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Histórico</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* History */}
      <div className="space-y-3">
        {history.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma chamada enviada ainda.</p>
        )}
        {history.map((call) => (
          <div
            key={call.id}
            className="rounded-2xl bg-card border border-border p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">{call.created_by_name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(call.created_at), "dd/MM HH:mm")}
              </span>
            </div>
            <p className="text-sm text-foreground">{call.message}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Users size={10} />
                <span>Para: {getTargetLabel(call)}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Eye size={10} />
                <span>{call.viewCount} viram</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
