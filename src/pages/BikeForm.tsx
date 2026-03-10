import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, DollarSign, TrendingUp } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  useBikeModel,
  useBikeModelParts,
  useCreateBikeModel,
  useUpdateBikeModel,
  useSaveBikeModelParts,
} from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
import { useToast } from "@/hooks/use-toast";
import { PartSelector } from "@/components/bikes/PartSelector";

const bikeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  frame_size: z.string().optional(),
  rim_size: z.string().optional(),
  color: z.string().optional(),
  weight_kg: z.number().min(0).optional(),
  description: z.string().optional(),
  visible_on_storefront: z.boolean().default(false),
  stock_qty: z.number().int().min(0).default(0),
  alert_stock: z.number().int().min(0).default(0),
  cost_mode: z.enum(["fixed", "manual"]).default("fixed"),
  cost_price: z.number().min(0).default(0),
  sale_price: z.number().min(0).default(0),
});

type BikeFormValues = z.infer<typeof bikeSchema>;

interface TemplatePart {
  key: string;
  part_id: string | null;
  part_name_override: string | null;
  quantity: number;
  notes: string | null;
  unit_cost: number;
}

/** Formats a number as BRL currency */
function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BikeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id && id !== "nova";

  const { data: bike } = useBikeModel(isEditing ? id : undefined);
  const { data: existingParts } = useBikeModelParts(isEditing ? id : undefined);
  const { data: allParts = [] } = useParts();

  const createBike = useCreateBikeModel();
  const updateBike = useUpdateBikeModel();
  const saveParts = useSaveBikeModelParts();

  const [templateParts, setTemplateParts] = useState<TemplatePart[]>([]);
  const [bikeImages, setBikeImages] = useState<string[]>([]);

  const form = useForm<BikeFormValues>({
    resolver: zodResolver(bikeSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      brand: "",
      frame_size: "",
      rim_size: "",
      color: "",
      weight_kg: undefined,
      description: "",
      visible_on_storefront: false,
      stock_qty: 0,
      alert_stock: 0,
      cost_mode: "fixed",
      cost_price: 0,
      sale_price: 0,
    },
  });

  const costMode = form.watch("cost_mode");
  const costPrice = form.watch("cost_price");
  const salePrice = form.watch("sale_price");

  // For manual mode, sum up part costs * quantities
  const manualCost = useMemo(() => {
    return templateParts.reduce((sum, p) => sum + p.unit_cost * p.quantity, 0);
  }, [templateParts]);

  const effectiveCost = costMode === "fixed" ? costPrice : manualCost;
  const profitValue = salePrice - effectiveCost;
  const profitPercent = effectiveCost > 0 ? (profitValue / effectiveCost) * 100 : 0;

  // Load existing data
  useEffect(() => {
    if (bike) {
      form.reset({
        name: bike.name,
        sku: bike.sku || "",
        category: bike.category || "",
        brand: (bike as any).brand || "",
        frame_size: (bike as any).frame_size || "",
        rim_size: (bike as any).rim_size || "",
        color: (bike as any).color || "",
        weight_kg: Number((bike as any).weight_kg) || undefined,
        description: bike.description || "",
        visible_on_storefront: bike.visible_on_storefront,
        stock_qty: Number((bike as any).stock_qty) || 0,
        alert_stock: Number((bike as any).alert_stock) || 0,
        cost_mode: (bike as any).cost_mode || "fixed",
        cost_price: Number((bike as any).cost_price) || 0,
        sale_price: Number((bike as any).sale_price) || 0,
      });
      setBikeImages((bike as any).images || []);
    }
  }, [bike]);

  useEffect(() => {
    if (existingParts) {
      setTemplateParts(
        existingParts.map((p) => ({
          key: p.id,
          part_id: p.part_id,
          part_name_override: p.part_name_override,
          quantity: p.quantity,
          notes: p.notes,
          unit_cost: Number((p as any).unit_cost) || 0,
        }))
      );
    }
  }, [existingParts]);

  const addRow = () => {
    setTemplateParts((prev) => [
      ...prev,
      { key: crypto.randomUUID(), part_id: null, part_name_override: null, quantity: 1, notes: null, unit_cost: 0 },
    ]);
  };

  const removeRow = (key: string) => {
    setTemplateParts((prev) => prev.filter((p) => p.key !== key));
  };

  const updateRow = (key: string, updates: Partial<TemplatePart>) => {
    setTemplateParts((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...updates } : p))
    );
  };

  /** When selecting a part from catalog, auto-fill its unit_cost */
  const handleSelectPart = (key: string, partId: string) => {
    const catalogPart = allParts.find((p) => p.id === partId);
    updateRow(key, {
      part_id: partId,
      part_name_override: null,
      unit_cost: Number((catalogPart as any)?.unit_cost) || 0,
    });
  };

  const onSubmit = async (values: BikeFormValues) => {
    try {
      const payload: any = {
        name: values.name,
        category: values.category || null,
        brand: values.brand || null,
        frame_size: values.frame_size || null,
        rim_size: values.rim_size || null,
        color: values.color || null,
        weight_kg: values.weight_kg || null,
        description: values.description || null,
        visible_on_storefront: values.visible_on_storefront,
        stock_qty: values.stock_qty,
        alert_stock: values.alert_stock,
        cost_mode: values.cost_mode,
        cost_price: values.cost_mode === "fixed" ? values.cost_price : manualCost,
        sale_price: values.sale_price,
        images: bikeImages,
      };
      if (isEditing && values.sku) {
        payload.sku = values.sku;
      }

      let bikeId: string;

      if (isEditing) {
        await updateBike.mutateAsync({ id, ...payload });
        bikeId = id;
      } else {
        const created = await createBike.mutateAsync(payload);
        bikeId = created.id;
      }

      // Save template parts (only in manual mode they matter, but save anyway)
      if (values.cost_mode === "manual") {
        await saveParts.mutateAsync({
          bikeModelId: bikeId,
          parts: templateParts.map((p) => ({
            part_id: p.part_id,
            part_name_override: p.part_name_override,
            quantity: p.quantity,
            notes: p.notes,
            sort_order: 0,
            unit_cost: p.unit_cost,
          })),
        });
      }

      toast({ title: isEditing ? "Bike atualizada" : "Bike criada com sucesso" });
      navigate("/bikes");
    } catch {
      toast({ title: "Erro ao salvar bike", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => navigate("/bikes")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <h1 className="text-lg font-semibold text-foreground">
        {isEditing ? "Editar Bike" : "Nova Bike"}
      </h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informações do Modelo */}
        <section className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Informações do Modelo
          </h3>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-sm">Fotos</Label>
            <ImageUpload images={bikeImages} onChange={setBikeImages} folder="bikes" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Nome *</Label>
            <Input
              {...form.register("name")}
              className="bg-card border-border h-9 text-sm"
              placeholder="Ex: Trail X Pro"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          {isEditing && (
            <div className="space-y-2">
              <Label className="text-sm">SKU</Label>
              <Input
                {...form.register("sku")}
                className="bg-card border-border h-9 text-sm font-mono"
                placeholder="Gerado automaticamente"
              />
              <p className="text-[10px] text-muted-foreground">Código interno — editável após criação</p>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm">Categoria</Label>
            <Select
              value={form.watch("category") || ""}
              onValueChange={(val) => form.setValue("category", val)}
            >
              <SelectTrigger className="bg-card border-border h-9 text-sm">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "MTB",
                  "Speed / Road",
                  "Gravel",
                  "Urban / Cidade",
                  "BMX",
                  "Elétrica",
                  "Infantil",
                  "Dobrável",
                  "Cargo",
                  "Touring",
                ].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Marca</Label>
            <Input
              {...form.register("brand")}
              className="bg-card border-border h-9 text-sm"
              placeholder="Ex: Shimano, Caloi, Trek"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Tamanho do quadro</Label>
              <Input
                {...form.register("frame_size")}
                className="bg-card border-border h-9 text-sm"
                placeholder="Ex: 17, M, 29"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Tamanho do aro</Label>
              <Input
                {...form.register("rim_size")}
                className="bg-card border-border h-9 text-sm"
                placeholder="Ex: 26, 29, 700c"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Cor</Label>
              <Input
                {...form.register("color")}
                className="bg-card border-border h-9 text-sm"
                placeholder="Ex: Preto, Vermelho"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={form.watch("weight_kg") ?? ""}
                onChange={(e) => form.setValue("weight_kg", parseFloat(e.target.value) || undefined)}
                className="bg-card border-border h-9 text-sm"
                placeholder="Ex: 12.5"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Descrição</Label>
            <Textarea
              {...form.register("description")}
              className="bg-card border-border text-sm min-h-[80px] resize-none"
              placeholder="Descrição do modelo..."
            />
          </div>
        </section>

        <Separator className="bg-border" />

        {/* Modo de Custo */}
        <section className="space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Precificação
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => form.setValue("cost_mode", "fixed")}
              className={`p-3 rounded-md border text-left transition-colors ${
                costMode === "fixed"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">Bike pronta</p>
              <p className="text-xs mt-0.5 opacity-70">Preço de custo fixo</p>
            </button>
            <button
              type="button"
              onClick={() => form.setValue("cost_mode", "manual")}
              className={`p-3 rounded-md border text-left transition-colors ${
                costMode === "manual"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">Montagem manual</p>
              <p className="text-xs mt-0.5 opacity-70">Custo calculado pelas peças</p>
            </button>
          <div className="space-y-2">
          {/* Fixed cost mode */}
          {costMode === "fixed" && (
            <div className="space-y-2">
              <Label className="text-sm">Preço de custo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={costPrice || ""}
                onChange={(e) => form.setValue("cost_price", parseFloat(e.target.value) || 0)}
                className="bg-card border-border h-9 text-sm"
                placeholder="0,00"
              />
            </div>
          )}

          {/* Manual cost mode — Template de Peças */}
          {costMode === "manual" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Peças da bike
                </h4>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={addRow}>
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </div>

              {templateParts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma peça adicionada
                </p>
              ) : (
                <div className="space-y-2">
                  {templateParts.map((tp) => (
                    <div key={tp.key} className="flex items-start gap-2 p-3 border border-border rounded-md bg-card">
                      <div className="flex-1 space-y-2">
                        <PartSelector
                          parts={allParts}
                          selectedPartId={tp.part_id}
                          customName={tp.part_name_override}
                          onSelectPart={(partId) => handleSelectPart(tp.key, partId)}
                          onCustomName={(name) => updateRow(tp.key, { part_id: null, part_name_override: name })}
                        />
                        <div className="flex gap-2">
                          <div className="w-16">
                            <Label className="text-xs text-muted-foreground">Qtd</Label>
                            <Input
                              type="number"
                              min={1}
                              value={tp.quantity}
                              onChange={(e) => updateRow(tp.key, { quantity: parseInt(e.target.value) || 1 })}
                              className="bg-background border-border h-8 text-xs"
                            />
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">Custo unit. (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={tp.unit_cost || ""}
                              onChange={(e) => updateRow(tp.key, { unit_cost: parseFloat(e.target.value) || 0 })}
                              className="bg-background border-border h-8 text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Subtotal</Label>
                            <div className="h-8 flex items-center text-xs text-muted-foreground">
                              {formatBRL(tp.unit_cost * tp.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                        onClick={() => removeRow(tp.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {/* Manual cost total */}
                  <div className="flex justify-between items-center px-3 py-2 bg-card border border-border rounded-md">
                    <span className="text-xs font-medium text-muted-foreground">Custo total das peças</span>
                    <span className="text-sm font-semibold text-foreground">{formatBRL(manualCost)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sale price — always shown */}
          <div className="space-y-2">
            <Label className="text-sm">Preço de venda (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={salePrice || ""}
              onChange={(e) => form.setValue("sale_price", parseFloat(e.target.value) || 0)}
              className="bg-card border-border h-9 text-sm"
              placeholder="0,00"
            />
          </div>

          {/* Margin display */}
          {(effectiveCost > 0 || salePrice > 0) && (
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-md border border-border bg-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Margem (R$)</span>
                </div>
                <p className={`text-base font-semibold ${profitValue >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {formatBRL(profitValue)}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-md border border-border bg-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Margem (%)</span>
                </div>
                <p className={`text-base font-semibold ${profitPercent >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {profitPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </section>

        <Separator className="bg-border" />

        {/* Estoque */}
        <section className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Estoque
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Estoque atual</Label>
              <Input
                type="number"
                min={0}
                value={form.watch("stock_qty")}
                onChange={(e) => form.setValue("stock_qty", parseInt(e.target.value) || 0)}
                className="bg-card border-border h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Estoque de alerta</Label>
              <Input
                type="number"
                min={0}
                value={form.watch("alert_stock")}
                onChange={(e) => form.setValue("alert_stock", parseInt(e.target.value) || 0)}
                className="bg-card border-border h-9 text-sm"
                placeholder="Ex: 2"
              />
              <p className="text-[10px] text-muted-foreground">Avisa quando chegar nessa quantidade</p>
            </div>
          </div>
        </section>

        <Separator className="bg-border" />

        {/* Visibilidade */}
        <section className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Visibilidade
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Exibir na loja</p>
              <p className="text-xs text-muted-foreground">
                Quando ativo, esta bike poderá aparecer no site público
              </p>
            </div>
            <Switch
              checked={form.watch("visible_on_storefront")}
              onCheckedChange={(val) => form.setValue("visible_on_storefront", val)}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" className="flex-1">
            {isEditing ? "Salvar" : "Criar bike"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/bikes")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
