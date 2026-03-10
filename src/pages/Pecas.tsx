import { useState } from "react";
import { Search, Plus, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParts, useUpdatePart, useDeletePart, type Part } from "@/hooks/useParts";
import { PartDrawer } from "@/components/parts/PartDrawer";

export default function Pecas() {
  const { data: parts = [], isLoading } = useParts();
  const updatePart = useUpdatePart();
  const deletePart = useDeletePart();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  const filtered = parts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleVisibility = (part: Part) => {
    updatePart.mutate({
      id: part.id,
      visible_on_storefront: !part.visible_on_storefront,
    });
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setDrawerOpen(true);
  };

  const handleNew = () => {
    setEditingPart(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Peças</h1>
        <Button size="sm" onClick={handleNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Peça
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-card border-border"
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Nome</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Categoria</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Aro</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Quadro</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Estoque</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Visível</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  {search ? "Nenhuma peça encontrada" : "Nenhuma peça cadastrada"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((part) => (
                <TableRow key={part.id} className="border-border">
                  <TableCell className="text-sm font-medium text-foreground">{part.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{part.category || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{part.rim_size || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{part.frame_size || "—"}</TableCell>
                  <TableCell className="text-sm text-center text-foreground">{part.stock_qty}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={part.visible_on_storefront}
                      onCheckedChange={() => handleToggleVisibility(part)}
                      className="mx-auto"
                    />
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PartDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        part={editingPart}
      />
    </div>
  );
}
