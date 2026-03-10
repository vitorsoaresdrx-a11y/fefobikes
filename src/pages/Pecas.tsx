import { useState, useMemo } from "react";
import { Search, Plus, Trash2, Pencil, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useParts, useDeletePart, type Part } from "@/hooks/useParts";
import { PartDrawer } from "@/components/parts/PartDrawer";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type SortField = "name" | "stock_qty" | "unit_cost" | "sale_price" | "profit";
type SortDir = "asc" | "desc";

export default function Pecas() {
  const { data: parts = [], isLoading } = useParts();
  const deletePart = useDeletePart();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const getProfit = (p: Part) => (Number((p as any).sale_price) || 0) - (Number((p as any).unit_cost) || 0);

  const filtered = useMemo(() => {
    let list = parts.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(search.toLowerCase())
    );

    list.sort((a, b) => {
      let va: number | string;
      let vb: number | string;

      switch (sortField) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "stock_qty":
          va = a.stock_qty;
          vb = b.stock_qty;
          break;
        case "unit_cost":
          va = Number((a as any).unit_cost) || 0;
          vb = Number((b as any).unit_cost) || 0;
          break;
        case "sale_price":
          va = Number((a as any).sale_price) || 0;
          vb = Number((b as any).sale_price) || 0;
          break;
        case "profit":
          va = getProfit(a);
          vb = getProfit(b);
          break;
        default:
          return 0;
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [parts, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setDrawerOpen(true);
  };

  const handleNew = () => {
    setEditingPart(null);
    setDrawerOpen(true);
  };

  const totalStock = filtered.reduce((s, p) => s + p.stock_qty, 0);
  const totalProfit = filtered.reduce((s, p) => s + getProfit(p) * p.stock_qty, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">Peças</h1>
        <Button size="sm" onClick={handleNew} className="gap-1.5 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nova Peça
        </Button>
      </div>

      {/* Search + Sort */}
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
        <Select
          value={`${sortField}-${sortDir}`}
          onValueChange={(val) => {
            const [f, d] = val.split("-") as [SortField, SortDir];
            setSortField(f);
            setSortDir(d);
          }}
        >
          <SelectTrigger className="h-9 w-auto min-w-[180px] text-xs bg-card border-border">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit-desc">Mais lucrativo</SelectItem>
            <SelectItem value="profit-asc">Menos lucrativo</SelectItem>
            <SelectItem value="stock_qty-desc">Mais em estoque</SelectItem>
            <SelectItem value="stock_qty-asc">Menos em estoque</SelectItem>
            <SelectItem value="sale_price-desc">Maior preço de venda</SelectItem>
            <SelectItem value="sale_price-asc">Menor preço de venda</SelectItem>
            <SelectItem value="unit_cost-desc">Maior custo</SelectItem>
            <SelectItem value="unit_cost-asc">Menor custo</SelectItem>
            <SelectItem value="name-asc">Nome A-Z</SelectItem>
            <SelectItem value="name-desc">Nome Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>
                <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  Item <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button type="button" onClick={() => toggleSort("stock_qty")} className="flex items-center gap-1 text-xs text-muted-foreground font-medium mx-auto">
                  Qtd <SortIcon field="stock_qty" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button type="button" onClick={() => toggleSort("unit_cost")} className="flex items-center gap-1 text-xs text-muted-foreground font-medium ml-auto">
                  Custo <SortIcon field="unit_cost" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button type="button" onClick={() => toggleSort("sale_price")} className="flex items-center gap-1 text-xs text-muted-foreground font-medium ml-auto">
                  Venda <SortIcon field="sale_price" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button type="button" onClick={() => toggleSort("profit")} className="flex items-center gap-1 text-xs text-muted-foreground font-medium ml-auto">
                  Lucro <SortIcon field="profit" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <span className="text-xs text-muted-foreground font-medium">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  {search ? "Nenhuma peça encontrada" : "Nenhuma peça cadastrada"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((part) => {
                const cost = Number((part as any).unit_cost) || 0;
                const sale = Number((part as any).sale_price) || 0;
                const profit = sale - cost;

                return (
                  <TableRow key={part.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{part.name}</p>
                        {part.category && (
                          <p className="text-xs text-muted-foreground">{part.category}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-center text-foreground">
                      {part.stock_qty}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {formatBRL(cost)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-foreground">
                      {formatBRL(sale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                        {formatBRL(profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(part)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deletePart.mutate(part.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{filtered.length} peça{filtered.length !== 1 ? "s" : ""}</span>
          <span>•</span>
          <span>{totalStock} un. em estoque</span>
          <span>•</span>
          <span>Lucro potencial: <span className={totalProfit >= 0 ? "text-emerald-500" : "text-destructive"}>{formatBRL(totalProfit)}</span></span>
        </div>
      )}

      <PartDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        part={editingPart}
      />
    </div>
  );
}
