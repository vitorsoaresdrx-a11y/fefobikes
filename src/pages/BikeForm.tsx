import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
  category: z.string().optional(),
  description: z.string().optional(),
  visible_on_storefront: z.boolean().default(false),
});

type BikeFormValues = z.infer<typeof bikeSchema>;

interface TemplatePart {
  key: string; // client-side key for React
  part_id: string | null;
  part_name_override: string | null;
  quantity: number;
  notes: string | null;
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

  const form = useForm<BikeFormValues>({
    resolver: zodResolver(bikeSchema),
    defaultValues: { name: "", category: "", description: "", visible_on_storefront: false },
  });

  // Load existing data
  useEffect(() => {
    if (bike) {
      form.reset({
        name: bike.name,
        category: bike.category || "",
        description: bike.description || "",
        visible_on_storefront: bike.visible_on_storefront,
      });
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
        }))
      );
    }
  }, [existingParts]);

  const addRow = () => {
    setTemplateParts((prev) => [
      ...prev,
      { key: crypto.randomUUID(), part_id: null, part_name_override: null, quantity: 1, notes: null },
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

  const onSubmit = async (values: BikeFormValues) => {
    try {
      const payload = {
        name: values.name,
        category: values.category || null,
        description: values.description || null,
        visible_on_storefront: values.visible_on_storefront,
      };

      let bikeId: string;

      if (isEditing) {
        await updateBike.mutateAsync({ id, ...payload });
        bikeId = id;
      } else {
        const created = await createBike.mutateAsync(payload);
        bikeId = created.id;
      }

      // Save template parts
      await saveParts.mutateAsync({
        bikeModelId: bikeId,
        parts: templateParts.map((p) => ({
          part_id: p.part_id,
          part_name_override: p.part_name_override,
          quantity: p.quantity,
          notes: p.notes,
          sort_order: 0,
        })),
      });

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
            <Label className="text-sm">Descrição</Label>
            <Textarea
              {...form.register("description")}
              className="bg-card border-border text-sm min-h-[80px] resize-none"
              placeholder="Descrição do modelo..."
            />
          </div>
        </section>

        <Separator className="bg-border" />

        {/* Template de Peças */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Template de Peças
            </h3>
            <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={addRow}>
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </div>

          {templateParts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma peça adicionada ao template
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
                      onSelectPart={(partId) => updateRow(tp.key, { part_id: partId, part_name_override: null })}
                      onCustomName={(name) => updateRow(tp.key, { part_id: null, part_name_override: name })}
                    />
                    <div className="flex gap-2">
                      <div className="w-20">
                        <Label className="text-xs text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tp.quantity}
                          onChange={(e) => updateRow(tp.key, { quantity: parseInt(e.target.value) || 1 })}
                          className="bg-background border-border h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Notas</Label>
                        <Input
                          value={tp.notes || ""}
                          onChange={(e) => updateRow(tp.key, { notes: e.target.value || null })}
                          className="bg-background border-border h-8 text-xs"
                          placeholder="Opcional"
                        />
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
            </div>
          )}
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
