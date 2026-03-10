import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  QrCode,
  Tags,
  X,
  Package,
  TrendingUp,
  Layers,
  Box,
} from "lucide-react";
import { useParts, useDeletePart, type Part } from "@/hooks/useParts";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { PartDrawer } from "@/components/parts/PartDrawer";
import { QRCodeModal } from "@/components/QRCodeModal";

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
    md: "h-10 px-4 py-2 text-sm font-bold",
    lg: "h-12 px-8 rounded-2xl text-base font-bold",
    icon: "h-9 w-9 flex items-center justify-center rounded-xl",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type SortField = "name" | "stock_qty" | "unit_cost" | "sale_price" | "profit";
type SortDir = "asc" | "desc";

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  tag,
  color = "text-white",
  isCurrency = false,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tag: string;
  color?: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="relative group bg-[#161618] border border-zinc-800 rounded-[32px] p-8 hover:border-zinc-700 transition-all duration-500 overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.03] text-zinc-600">
        <Icon size={160} />
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full space-y-10">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
            <Icon size={22} />
          </div>
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full uppercase tracking-widest">
            {tag}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
          <h2 className={`text-2xl font-black tracking-tighter ${color}`}>
            {isCurrency ? formatBRL(value) : value}
          </h2>
        </div>
      </div>
    </div>
  );
}

// ─── SortButton ───────────────────────────────────────────────────────────────

function SortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
        active ? "bg-[#2C2C2E] text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Pecas() {
  const { data: parts = [], isLoading } = useParts();
  const deletePart = useDeletePart();
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [qrPart, setQrPart] = useState<Part | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const getProfit = (p: Part) =>
    (Number((p as any).sale_price) || 0) - (Number((p as any).unit_cost) || 0);

  const filtered = useMemo(() => {
    let list = parts.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(search.toLowerCase())
    );

    list.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (sortField) {
        case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
        case "stock_qty": va = a.stock_qty; vb = b.stock_qty; break;
        case "unit_cost": va = Number((a as any).unit_cost) || 0; vb = Number((b as any).unit_cost) || 0; break;
        case "sale_price": va = Number((a as any).sale_price) || 0; vb = Number((b as any).sale_price) || 0; break;
        case "profit": va = getProfit(a); vb = getProfit(b); break;
        default: return 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [parts, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleEdit = (part: Part) => { setEditingPart(part); setDrawerOpen(true); };
  const handleNew = () => { setEditingPart(null); setDrawerOpen(true); };

  const totalStock = filtered.reduce((s, p) => s + p.stock_qty, 0);
  const totalProfit = filtered.reduce((s, p) => s + getProfit(p) * p.stock_qty, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
                <Box className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#2952FF]">INVENTORY MASTER</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Produtos & Peças</h1>
          </div>
          <div className="flex items-center gap-3">
            <Btn variant="secondary" size="lg" onClick={() => setCategoriesOpen(true)}>
              <Tags className="w-5 h-5 mr-2" />
              Categorias
            </Btn>
            <Btn variant="primary" size="lg" onClick={handleNew}>
              <Plus className="w-5 h-5 mr-2 stroke-[3]" />
              Novo Produto
            </Btn>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total de Itens" value={filtered.length} icon={Package} tag="Variedade" />
          <StatCard title="Peças em Estoque" value={totalStock} icon={Layers} tag="Volume" color="text-indigo-400" />
          <StatCard title="Lucro Potencial" value={totalProfit} icon={TrendingUp} tag="Rentabilidade" color="text-emerald-400" isCurrency />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 bg-[#161618] border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-zinc-200 outline-none focus:border-[#2952FF] transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex p-1 bg-[#161618] border border-zinc-800 rounded-2xl shrink-0">
            <SortButton active={sortField === "profit"} onClick={() => toggleSort("profit")}>Lucro</SortButton>
            <SortButton active={sortField === "stock_qty"} onClick={() => toggleSort("stock_qty")}>Qtd</SortButton>
            <SortButton active={sortField === "unit_cost"} onClick={() => toggleSort("unit_cost")}>Custo</SortButton>
            <SortButton active={sortField === "sale_price"} onClick={() => toggleSort("sale_price")}>Venda</SortButton>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[#161618] border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between">
            <h3 className="font-bold text-lg">Catálogo de Produtos</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2952FF] animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estoque Atualizado</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left">
                  <th className="px-8 py-4">
                    <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1">
                      Item <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-8 py-4 text-center">
                    <button type="button" onClick={() => toggleSort("stock_qty")} className="flex items-center gap-1 mx-auto">
                      Estoque <SortIcon field="stock_qty" />
                    </button>
                  </th>
                  <th className="px-8 py-4 text-right">
                    <button type="button" onClick={() => toggleSort("unit_cost")} className="flex items-center gap-1 ml-auto">
                      Custo <SortIcon field="unit_cost" />
                    </button>
                  </th>
                  <th className="px-8 py-4 text-right">
                    <button type="button" onClick={() => toggleSort("sale_price")} className="flex items-center gap-1 ml-auto">
                      Venda <SortIcon field="sale_price" />
                    </button>
                  </th>
                  <th className="px-8 py-4 text-right">
                    <button type="button" onClick={() => toggleSort("profit")} className="flex items-center gap-1 ml-auto">
                      Lucro Un. <SortIcon field="profit" />
                    </button>
                  </th>
                  <th className="px-8 py-4 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-zinc-500 font-bold uppercase tracking-widest">
                      Carregando Inventário...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-zinc-600 text-sm">
                      {search ? `Nenhuma peça encontrada para "${search}"` : "Nenhuma peça cadastrada"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((part) => {
                    const cost = Number((part as any).unit_cost) || 0;
                    const sale = Number((part as any).sale_price) || 0;
                    const profit = sale - cost;
                    return (
                      <tr key={part.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:border-[#2952FF]/50 transition-colors shrink-0">
                              <Box className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-100">{part.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {part.category && (
                                  <span className="text-[10px] font-bold text-[#2952FF] uppercase tracking-wider">
                                    {part.category}
                                  </span>
                                )}
                                {part.sku && (
                                  <>
                                    <span className="text-zinc-700 font-bold">·</span>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{part.sku}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-base font-black text-zinc-100">{part.stock_qty}</span>
                            <span className="text-[8px] font-bold text-zinc-500 uppercase">Unidades</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-sm text-zinc-500">{formatBRL(cost)}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-base font-black text-white">{formatBRL(sale)}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span
                            className={`text-sm font-black px-3 py-1 rounded-lg ${
                              profit >= 0
                                ? "bg-emerald-500/5 text-emerald-400 border border-emerald-500/10"
                                : "bg-red-500/5 text-red-400 border border-red-500/10"
                            }`}
                          >
                            {formatBRL(profit)}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            {part.sku && (
                              <Btn
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg"
                                onClick={() => setQrPart(part)}
                              >
                                <QrCode size={14} />
                              </Btn>
                            )}
                            <Btn
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg"
                              onClick={() => handleEdit(part)}
                            >
                              <Pencil size={14} />
                            </Btn>
                            <Btn
                              variant="destructive"
                              size="icon"
                              className="w-8 h-8 rounded-lg"
                              onClick={() => deletePart.mutate(part.id)}
                            >
                              <Trash2 size={14} />
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer da tabela */}
          {filtered.length > 0 && (
            <div className="p-8 bg-black/20 flex items-center justify-between border-t border-zinc-800/30">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {filtered.length} produto{filtered.length !== 1 ? "s" : ""} · {totalStock} un. em estoque
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lucro Potencial</span>
                <span className={`text-lg font-black ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatBRL(totalProfit)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PartDrawer — lógica real do Lovable */}
      <PartDrawer open={drawerOpen} onOpenChange={setDrawerOpen} part={editingPart} />

      {/* QR Modal — lógica real do Lovable */}
      {qrPart?.sku && (
        <QRCodeModal
          open={!!qrPart}
          onOpenChange={(open) => !open && setQrPart(null)}
          sku={qrPart.sku}
          productName={qrPart.name}
        />
      )}

      {/* Modal de Categorias */}
      {categoriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#1C1C1E] w-full max-w-md rounded-[40px] border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Categorias</h2>
                  <p className="text-zinc-500 text-sm">Organize seu catálogo de peças</p>
                </div>
                <button
                  onClick={() => setCategoriesOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form com lógica real — createCategory.mutate */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = newCatName.trim();
                  if (!trimmed) return;
                  createCategory.mutate(trimmed, { onSuccess: () => setNewCatName("") });
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nova categoria..."
                  maxLength={60}
                  className="flex-1 h-12 bg-[#161618] border border-zinc-800 rounded-2xl px-4 text-sm text-zinc-100 outline-none focus:border-[#2952FF] transition-all placeholder:text-zinc-600"
                />
                <Btn
                  type="submit"
                  variant="primary"
                  size="icon"
                  className="h-12 w-12 rounded-2xl"
                  disabled={!newCatName.trim() || createCategory.isPending}
                >
                  <Plus size={20} />
                </Btn>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <p className="text-sm text-zinc-600 text-center py-4">Nenhuma categoria cadastrada</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="group flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-sm font-bold text-zinc-300">{cat.name}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                        onClick={() => deleteCategory.mutate(cat.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <Btn
                variant="ghost"
                className="w-full h-12 rounded-2xl font-bold"
                onClick={() => setCategoriesOpen(false)}
              >
                Fechar Janela
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
