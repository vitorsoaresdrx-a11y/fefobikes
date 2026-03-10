import { useState, useMemo } from "react";
import { Search, AlertTriangle, AlertCircle, CheckCircle2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParts } from "@/hooks/useParts";
import { useBikeModels } from "@/hooks/useBikes";

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
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    badge: "destructive" as const,
  },
  warning: {
    label: "Próximo do alerta",
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "outline" as const,
  },
  ok: {
    label: "Estoque ok",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "secondary" as const,
  },
};

export default function Estoque() {
  const { data: parts = [], isLoading: partsLoading } = useParts();
  const { data: bikes = [], isLoading: bikesLoading } = useBikeModels();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<"all" | "Peça" | "Bike">("all");

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

    if (filterStatus !== "all") {
      list = list.filter((i) => i.status === filterStatus);
    }

    if (filterType !== "all") {
      list = list.filter((i) => i.type === filterType);
    }

    // Sort: critical first, then warning, then ok
    const order = { critical: 0, warning: 1, ok: 2 };
    list.sort((a, b) => order[a.status] - order[b.status]);

    return list;
  }, [items, search, filterStatus, filterType]);

  const counts = useMemo(() => ({
    critical: items.filter((i) => i.status === "critical").length,
    warning: items.filter((i) => i.status === "warning").length,
    ok: items.filter((i) => i.status === "ok").length,
  }), [items]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Estoque</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["critical", "warning", "ok"] as StockStatus[]).map((status) => {
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                filterStatus === status
                  ? `${cfg.bg} ${cfg.border} border`
                  : "border-border bg-card hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${cfg.color}`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
              <p className={`text-xl font-semibold ${cfg.color}`}>{counts[status]}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Peça">Peças</SelectItem>
            <SelectItem value="Bike">Bikes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Item</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Tipo</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Estoque</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Alerta</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  {search || filterStatus !== "all"
                    ? "Nenhum item encontrado com esses filtros"
                    : "Nenhum item cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const cfg = statusConfig[item.status];
                const Icon = cfg.icon;

                return (
                  <TableRow key={`${item.type}-${item.id}`} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-8 w-8 rounded object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted/30 flex items-center justify-center border border-border shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {item.category && (
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-medium ${cfg.color}`}>{item.stock_qty}</span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {item.alert_stock > 0 ? item.alert_stock : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} ite{filtered.length !== 1 ? "ns" : "m"}
      </p>
    </div>
  );
}
