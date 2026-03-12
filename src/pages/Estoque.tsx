import { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  ArrowRight,
  Bike,
  Layers,
  History,
} from "lucide-react";
import { useParts, useUpdatePart } from "@/hooks/useParts";
import { useBikeModels, useUpdateBikeModel } from "@/hooks/useBikes";
import { useToast } from "@/hooks/use-toast";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}) => {
  const v = {
    primary: "bg-[#2952FF] text-white hover:bg-[#4A6FFF] shadow-[0_0_20px_rgba(41,82,255,0.2)]",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800",
    destructive: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  };
  const s = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 rounded-2xl text-base font-bold",
    icon: "h-9 w-9 flex items-center justify-center",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const BadgeEl = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "critical" | "warning" | "ok" | "default";
}) => {
  const styles = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    default: "bg-zinc-800 text-zinc-500 border-zinc-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

// ─── Tipos e Config ───────────────────────────────────────────────────────────

type StockStatus = "critical" | "warning" | "ok";
type FilterStatus = "all" | StockStatus;

interface StockItem {
  id: string;
  name: string;
  type: "Peça" | "Bike";
  category: string | null;
  stock_qty: number;
  alert_stock: number;
  status: StockStatus;
  image: string | null;
}

function getStatus(qty: number, alert: number): StockStatus {
  if (alert <= 0) return "ok";
  if (qty <= alert) return "critical";
  if (qty <= alert * 1.5) return "warning";
  return "ok";
}

const statusConfig = {
  critical: {
    label: "Em alerta",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.1)]",
    badgeVariant: "critical" as const,
  },
  warning: {
    label: "Atenção",
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    badgeVariant: "warning" as const,
  },
  ok: {
    label: "Estoque ok",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    badgeVariant: "ok" as const,
  },
};

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({
  status,
  count,
  active,
  onClick,
}: {
  status: StockStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={`relative group p-5 md:p-8 rounded-2xl md:rounded-[32px] border transition-all duration-500 text-left overflow-hidden ${
        active
          ? "bg-[#161618] border-[#2952FF] shadow-[0_0_30px_rgba(41,82,255,0.1)]"
          : "bg-[#161618] border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="absolute -right-4 -top-4 opacity-[0.03] text-zinc-600">
        <Icon size={120} />
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cfg.bg} ${cfg.color} ${cfg.glow}`}>
          <Icon className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{cfg.label}</p>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-4xl font-black tracking-tighter ${cfg.color}`}>{count}</h2>
            <span className="text-xs text-zinc-600 font-bold uppercase">Itens</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Estoque() {
  const { data: parts = [], isLoading: partsLoading } = useParts();
  const { data: bikes = [], isLoading: bikesLoading } = useBikeModels();
  const updatePart = useUpdatePart();
  const updateBike = useUpdateBikeModel();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<"all" | "Peça" | "Bike">("all");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [mode, setMode] = useState<"add" | "subtract" | null>(null);
  const [qty, setQty] = useState("");

  const isLoading = partsLoading || bikesLoading;

  const items: StockItem[] = useMemo(() => {
    const partItems: StockItem[] = parts.map((p) => ({
      id: p.id,
      name: p.name,
      type: "Peça" as const,
      category: p.category,
      stock_qty: p.stock_qty,
      alert_stock: Number((p as any).alert_stock) || 0,
      status: getStatus(p.stock_qty, Number((p as any).alert_stock) || 0),
      image: (p as any).images?.[0] || null,
    }));

    const bikeItems: StockItem[] = bikes.map((b) => ({
      id: b.id,
      name: b.name,
      type: "Bike" as const,
      category: b.category,
      stock_qty: Number((b as any).stock_qty) || 0,
      alert_stock: Number((b as any).alert_stock) || 0,
      status: getStatus(Number((b as any).stock_qty) || 0, Number((b as any).alert_stock) || 0),
      image: (b as any).images?.[0] || null,
    }));

    return [...partItems, ...bikeItems];
  }, [parts, bikes]);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterType !== "all") list = list.filter((i) => i.type === filterType);
    const order = { critical: 0, warning: 1, ok: 2 };
    list.sort((a, b) => order[a.status] - order[b.status]);
    return list;
  }, [items, search, filterStatus, filterType]);

  const counts = useMemo(() => ({
    critical: items.filter((i) => i.status === "critical").length,
    warning: items.filter((i) => i.status === "warning").length,
    ok: items.filter((i) => i.status === "ok").length,
  }), [items]);

  const openModal = (item: StockItem) => { setSelectedItem(item); setMode(null); setQty(""); };
  const closeModal = () => { setSelectedItem(null); setMode(null); setQty(""); };

  const handleConfirm = () => {
    if (!selectedItem || !mode) return;
    const value = parseInt(qty) || 0;
    if (value <= 0) {
      toast({ title: "Insira uma quantidade válida", variant: "destructive" });
      return;
    }
    const newQty =
      mode === "add"
        ? selectedItem.stock_qty + value
        : Math.max(0, selectedItem.stock_qty - value);

    if (selectedItem.type === "Peça") {
      updatePart.mutate({ id: selectedItem.id, stock_qty: newQty } as any);
    } else {
      updateBike.mutate({ id: selectedItem.id, stock_qty: newQty });
    }

    toast({
      title: mode === "add" ? "Estoque adicionado" : "Estoque subtraído",
      description: `${selectedItem.name}: ${selectedItem.stock_qty} → ${newQty}`,
    });
    closeModal();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30">
      <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-6 md:space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#2952FF]">HUB DE OPERAÇÕES</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Estoque Geral</h1>
          </div>
          <div className="flex items-center gap-3">
            <Btn variant="secondary" size="lg" className="rounded-2xl">
              <History className="w-5 h-5 mr-2" />
              Histórico
            </Btn>
            <Btn variant="primary" size="lg">
              <Plus className="w-5 h-5 mr-2 stroke-[3]" />
              Entrada Manual
            </Btn>
          </div>
        </header>

        {/* Summary Cards — clicáveis como filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {(["critical", "warning", "ok"] as StockStatus[]).map((status) => (
            <SummaryCard
              key={status}
              status={status}
              count={counts[status]}
              active={filterStatus === status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 bg-[#161618] border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-zinc-200 outline-none focus:border-[#2952FF] transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex p-1 bg-[#161618] border border-zinc-800 rounded-2xl shrink-0">
            {(["all", "Peça", "Bike"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filterType === t ? "bg-[#2C2C2E] text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "all" ? "Tudo" : t + "s"}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[#161618] border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between">
            <h3 className="font-bold text-lg">Itens em Inventário</h3>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {filtered.length} {filtered.length !== 1 ? "itens" : "item"} filtrado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#2952FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-20 text-center text-zinc-600 text-sm">
                {search || filterStatus !== "all" || filterType !== "all"
                  ? "Nenhum item encontrado com esses filtros"
                  : "Nenhum item cadastrado"}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left">
                    <th className="px-8 py-4">Item / Categoria</th>
                    <th className="px-8 py-4">Tipo</th>
                    <th className="px-8 py-4 text-center">Disponível</th>
                    <th className="px-8 py-4 text-center">Alerta</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30 text-sm">
                  {filtered.map((item) => {
                    const cfg = statusConfig[item.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr
                        key={`${item.type}-${item.id}`}
                        onClick={() => openModal(item)}
                        className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:border-[#2952FF]/50 transition-colors overflow-hidden shrink-0">
                              {item.image ? (
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                              ) : item.type === "Bike" ? (
                                <Bike className="w-6 h-6" />
                              ) : (
                                <Package className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-100">{item.name}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                {item.category || "Sem Categoria"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <BadgeEl>{item.type}</BadgeEl>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`text-lg font-black ${cfg.color}`}>{item.stock_qty}</span>
                        </td>
                        <td className="px-8 py-6 text-center text-zinc-500 font-medium">
                          {item.alert_stock > 0 ? item.alert_stock : "—"}
                        </td>
                        <td className="px-8 py-6">
                          <div className={`flex items-center justify-end gap-2 ${cfg.color} font-bold text-xs uppercase tracking-tighter`}>
                            {cfg.label}
                            <StatusIcon className="w-4 h-4" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ajuste */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#1C1C1E] w-full max-w-md rounded-[40px] border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Ajustar Estoque</h2>
                  <p className="text-zinc-500 text-sm">Gerencie entrada e saída de itens</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              {/* Preview */}
              <div className="p-4 bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
                  {selectedItem.image ? (
                    <img src={selectedItem.image} alt="" className="w-full h-full object-cover" />
                  ) : selectedItem.type === "Bike" ? (
                    <Bike size={24} />
                  ) : (
                    <Package size={24} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">{selectedItem.name}</p>
                  <p className="text-xs text-zinc-500">
                    Estoque atual:{" "}
                    <span className="text-[#2952FF] font-black">{selectedItem.stock_qty}</span>
                  </p>
                </div>
              </div>

              {!mode ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode("add")}
                    className="h-32 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 flex flex-col items-center justify-center gap-3 transition-all"
                  >
                    <Plus className="w-8 h-8 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Entrada</span>
                  </button>
                  <button
                    onClick={() => setMode("subtract")}
                    className="h-32 rounded-3xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 flex flex-col items-center justify-center gap-3 transition-all"
                  >
                    <Minus className="w-8 h-8 text-red-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-red-500">Saída</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                      Quantidade para {mode === "add" ? "Adicionar" : "Retirar"}
                    </label>
                    <input
                      type="number"
                      autoFocus
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="0"
                      className="w-full h-14 bg-[#161618] border border-zinc-800 rounded-2xl px-6 text-2xl font-black text-white outline-none focus:border-[#2952FF] transition-all"
                    />
                  </div>

                  {qty && parseInt(qty) > 0 && (
                    <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
                      <span>{selectedItem.stock_qty}</span>
                      <ArrowRight size={14} />
                      <span className="font-black text-white text-lg">
                        {mode === "add"
                          ? selectedItem.stock_qty + (parseInt(qty) || 0)
                          : Math.max(0, selectedItem.stock_qty - (parseInt(qty) || 0))}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Btn variant="ghost" className="flex-1 h-12" onClick={() => { setMode(null); setQty(""); }}>
                      Voltar
                    </Btn>
                    <Btn variant="primary" className="flex-[2] h-12" onClick={handleConfirm}>
                      Confirmar Ajuste
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
