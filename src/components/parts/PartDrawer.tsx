import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCreatePart, useUpdatePart, type Part } from "@/hooks/useParts";
import { CategoryCombobox } from "@/components/parts/CategoryCombobox";
import { ImageUpload } from "@/components/ui/image-upload";

const partSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0).default(0),
  unit_cost: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type PartFormValues = z.infer<typeof partSchema>;

interface PartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part | null;
}

export function PartDrawer({ open, onOpenChange, part }: PartDrawerProps) {
  const createPart = useCreatePart();
  const updatePart = useUpdatePart();
  const isEditing = !!part;
  const [partImages, setPartImages] = useState<string[]>([]);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: "",
      category: "",
      stock_qty: 0,
      unit_cost: 0,
      sale_price: 0,
      notes: "",
    },
  });

  const unitCost = form.watch("unit_cost");
  const salePrice = form.watch("sale_price");
  const profit = salePrice - unitCost;

  useEffect(() => {
    if (open) {
      if (part) {
        form.reset({
          name: part.name,
          category: part.category || "",
          stock_qty: part.stock_qty,
          unit_cost: Number((part as any).unit_cost) || 0,
          sale_price: Number((part as any).sale_price) || 0,
          notes: part.notes || "",
        });
      } else {
        form.reset();
      }
    }
  }, [open, part]);

  const onSubmit = (values: PartFormValues) => {
    const payload = {
      name: values.name,
      category: values.category || null,
      stock_qty: values.stock_qty,
      unit_cost: values.unit_cost,
      sale_price: values.sale_price,
      notes: values.notes || null,
      // keep other fields null
      weight_capacity_kg: null,
      material: null,
      gears: null,
      hub_style: null,
      color: null,
      rim_size: null,
      frame_size: null,
      visible_on_storefront: false,
    };

    if (isEditing) {
      updatePart.mutate({ id: part.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createPart.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  function formatBRL(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {isEditing ? "Editar Peça" : "Nova Peça"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Informações */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Informações
            </h3>
            <div className="space-y-2">
              <Label className="text-sm">Item *</Label>
              <Input
                {...form.register("name")}
                className="bg-card border-border h-9 text-sm"
                placeholder="Ex: Freio a disco, Banco, Pedivela..."
                maxLength={100}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Categoria</Label>
              <CategoryCombobox
                value={form.watch("category") || ""}
                onChange={(val) => form.setValue("category", val)}
              />
            </div>
          </section>

          <Separator className="bg-border" />

          {/* Estoque e Preços */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estoque & Preços
            </h3>
            <div className="space-y-2">
              <Label className="text-sm">Quantidade em estoque</Label>
              <Input
                type="number"
                min={0}
                {...form.register("stock_qty")}
                className="bg-card border-border h-9 text-sm w-32"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Preço de custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={unitCost || ""}
                  onChange={(e) => form.setValue("unit_cost", parseFloat(e.target.value) || 0)}
                  className="bg-card border-border h-9 text-sm"
                  placeholder="0,00"
                />
              </div>
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
            </div>

            {/* Lucro preview */}
            {(unitCost > 0 || salePrice > 0) && (
              <div className="p-3 rounded-md border border-border bg-card">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Lucro por unidade</span>
                  <span className={`text-sm font-semibold ${profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {formatBRL(profit)}
                  </span>
                </div>
              </div>
            )}
          </section>

          <Separator className="bg-border" />

          {/* Notas */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Observações
            </h3>
            <Textarea
              {...form.register("notes")}
              placeholder="Observações opcionais..."
              className="bg-card border-border text-sm min-h-[60px] resize-none"
              maxLength={500}
            />
          </section>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" size="sm" className="flex-1">
              {isEditing ? "Salvar" : "Criar peça"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
