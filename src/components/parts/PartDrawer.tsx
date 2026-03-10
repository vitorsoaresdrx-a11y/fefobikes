import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCreatePart, useUpdatePart, type Part } from "@/hooks/useParts";
import { CategoryCombobox } from "@/components/parts/CategoryCombobox";

const partSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  weight_capacity_kg: z.coerce.number().optional().nullable(),
  material: z.string().optional(),
  gears: z.string().optional(),
  hub_style: z.string().optional(),
  color: z.string().optional(),
  rim_size: z.string().optional(),
  frame_size: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0).default(0),
  visible_on_storefront: z.boolean().default(false),
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

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: "",
      category: "",
      weight_capacity_kg: null,
      material: "",
      gears: "",
      hub_style: "",
      color: "",
      rim_size: "",
      frame_size: "",
      stock_qty: 0,
      visible_on_storefront: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (part) {
        form.reset({
          name: part.name,
          category: part.category || "",
          weight_capacity_kg: part.weight_capacity_kg,
          material: part.material || "",
          gears: part.gears || "",
          hub_style: part.hub_style || "",
          color: part.color || "",
          rim_size: part.rim_size || "",
          frame_size: part.frame_size || "",
          stock_qty: part.stock_qty,
          visible_on_storefront: part.visible_on_storefront,
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
      weight_capacity_kg: values.weight_capacity_kg ?? null,
      material: values.material || null,
      gears: values.gears || null,
      hub_style: values.hub_style || null,
      color: values.color || null,
      rim_size: values.rim_size || null,
      frame_size: values.frame_size || null,
      stock_qty: values.stock_qty,
      visible_on_storefront: values.visible_on_storefront,
      notes: values.notes || null,
    };

    if (isEditing) {
      updatePart.mutate({ id: part.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createPart.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {isEditing ? "Editar Peça" : "Nova Peça"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Informações Básicas */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Informações Básicas
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">Nome *</Label>
              <Input
                id="name"
                {...form.register("name")}
                className="bg-card border-border h-9 text-sm"
                placeholder="Nome da peça"
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

          {/* Especificações Técnicas */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Especificações Técnicas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Peso suportado (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("weight_capacity_kg")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Material</Label>
                <Input
                  {...form.register("material")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Marchas</Label>
                <Input
                  {...form.register("gears")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estilo de cubo</Label>
                <Input
                  {...form.register("hub_style")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cor</Label>
                <Input
                  {...form.register("color")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tamanho do aro</Label>
                <Input
                  {...form.register("rim_size")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tamanho do quadro</Label>
                <Input
                  {...form.register("frame_size")}
                  className="bg-card border-border h-9 text-sm"
                />
              </div>
            </div>
          </section>

          <Separator className="bg-border" />

          {/* Estoque */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estoque
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade atual</Label>
              <Input
                type="number"
                {...form.register("stock_qty")}
                className="bg-card border-border h-9 text-sm w-32"
              />
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
                  Quando ativo, esta peça poderá aparecer no site público
                </p>
              </div>
              <Switch
                checked={form.watch("visible_on_storefront")}
                onCheckedChange={(val) => form.setValue("visible_on_storefront", val)}
              />
            </div>
          </section>

          <Separator className="bg-border" />

          {/* Notas */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notas
            </h3>
            <Textarea
              {...form.register("notes")}
              placeholder="Observações opcionais..."
              className="bg-card border-border text-sm min-h-[80px] resize-none"
            />
          </section>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" size="sm" className="flex-1">
              {isEditing ? "Salvar" : "Criar peça"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
