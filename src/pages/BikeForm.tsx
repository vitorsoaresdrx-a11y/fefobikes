import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Camera,
  Save,
  Wrench,
  Activity,
  Image as ImageIcon,
  Tag,
  Maximize2,
  CreditCard,
  Layers,
  ChevronRight,
  Eye,
  Box,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Switch } from "@/components/ui/switch";
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

// ─── Schema ───────────────────────────────────────────────────────────────────
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
  pix_price: z.number().min(0).default(0),
  installment_price: z.number().min(0).default(0),
  installment_count: z.number().int().min(1).default(1),
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Sub-components (UI only) ─────────────────────────────────────────────────
const SectionHeader = ({
  title,
  icon: Icon,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  subtitle?: string;
}) => (
  <div className="flex flex-col gap-1 mb-8">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#2952FF]/10 flex items-center justify-center text-[#2952FF]">
        <Icon size={20} />
      </div>
      <h3 className="text-xl font-black text-white tracking-tight italic uppercase">{title}</h3>
    </div>
    {subtitle && <p className="text-xs text-zinc-500 ml-13 font-medium">{subtitle}</p>}
  </div>
);

const StatBox = ({
  title,
  value,
  icon,
  color = "text-white",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="p-6 bg-[#161618] border border-zinc-800 rounded-[32px] shadow-lg flex flex-col gap-2 hover:border-zinc-700 transition-all">
    <div className="flex items-center gap-2 text-zinc-500">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
    </div>
    <span className={`text-2xl font-black tracking-tighter ${color}`}>{value}</span>
  </div>
);

const SmallInput = ({
  label,
  placeholder,
  ...props
}: { label: string; placeholder?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5 group">
    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1 group-focus-within:text-[#2952FF] transition-colors">
      {label}
    </label>
    <input
      className="w-full h-12 bg-[#1C1C1E] border border-zinc-800 rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-[#2952FF] transition-all"
      placeholder={placeholder}
      {...props}
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
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
      pix_price: 0,
      installment_price: 0,
      installment_count: 1,
    },
  });

  const costMode = form.watch("cost_mode");
  const costPrice = form.watch("cost_price");
  const pixPrice = form.watch("pix_price");
  const installmentPrice = form.watch("installment_price");
  const installmentCount = form.watch("installment_count");

  const manualCost = useMemo(
    () => templateParts.reduce((sum, p) => sum + p.unit_cost * p.quantity, 0),
    [templateParts]
  );

  const effectiveCost = costMode === "fixed" ? costPrice : manualCost;
  const profitValue = pixPrice - effectiveCost;
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
        pix_price: Number((bike as any).pix_price) || 0,
        installment_price: Number((bike as any).installment_price) || 0,
        installment_count: Number((bike as any).installment_count) || 1,
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
      {
        key: crypto.randomUUID(),
        part_id: null,
        part_name_override: null,
        quantity: 1,
        notes: null,
        unit_cost: 0,
      },
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
        sale_price: values.pix_price,
        pix_price: values.pix_price,
        installment_price: values.installment_price,
        installment_count: values.installment_count,
        images: bikeImages,
      };
      if (isEditing && values.sku) payload.sku = values.sku;

      let bikeId: string;
      if (isEditing) {
        await updateBike.mutateAsync({ id, ...payload });
        bikeId = id;
      } else {
        const created = await createBike.mutateAsync(payload);
        bikeId = created.id;
      }

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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 pb-32">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">

          {/* ── Topbar ────────────────────────────────────────────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161618] p-6 rounded-[32px] border border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => navigate("/bikes")}
                className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition-all border border-zinc-800"
              >
                <ArrowLeft size={20} />
              </button>
            <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2952FF]">
                  Oficina & Vitrine
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">
                  {isEditing ? "Editar Bike" : "Nova Bike"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/bikes")}
                className="h-12 px-6 rounded-2xl border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-12 px-10 rounded-2xl bg-[#2952FF] text-white hover:bg-[#4A6FFF] shadow-[0_0_20px_rgba(41,82,255,0.3)] text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <Save size={16} />
                {isEditing ? "Salvar" : "Criar Bike"}
              </button>
            </div>
          </header>

          {/* ── Galeria ───────────────────────────────────────────────────── */}
          <div className="bg-[#161618] border border-zinc-800 rounded-[40px] p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <ImageIcon className="text-[#2952FF]" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">
                  Galeria do Marketplace
                </h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                {bikeImages.length} / 5 Imagens
              </span>
            </div>
            <ImageUpload images={bikeImages} onChange={setBikeImages} folder="bikes" />
          </div>

          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              title="Custo Montagem"
              value={formatBRL(effectiveCost)}
              icon={<Wrench size={14} />}
            />
            <StatBox
              title="Valor PIX"
              value={formatBRL(pixPrice)}
              icon={<DollarSign size={14} />}
              color="text-[#2952FF]"
            />
            <StatBox
              title="Margem Bruta"
              value={formatBRL(profitValue)}
              icon={<TrendingUp size={14} />}
              color={profitValue >= 0 ? "text-emerald-400" : "text-red-400"}
            />
            <StatBox
              title="Rentabilidade"
              value={profitPercent.toFixed(1) + "%"}
              icon={<Activity size={14} />}
              color={profitPercent >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>

          {/* ── Main Layout ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column */}
            <div className="lg:col-span-8 space-y-8">

              {/* Identidade */}
              <div className="bg-[#161618] border border-zinc-800 rounded-[40px] p-10 shadow-2xl">
                <SectionHeader
                  title="Identidade do Modelo"
                  icon={Tag}
                  subtitle="Configure como o produto será exibido para o cliente final."
                />

                <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2 group">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-[#2952FF] transition-colors">
                        Nome Comercial *
                      </label>
                      <input
                        {...form.register("name")}
                        className="w-full h-16 bg-[#1C1C1E] border border-zinc-800 rounded-2xl px-6 text-xl font-bold text-white outline-none focus:border-[#2952FF] transition-all"
                        placeholder="Ex: Trail X Pro"
                      />
                      {form.formState.errors.name && (
                        <p className="text-xs text-red-400 ml-1">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-[#2952FF] transition-colors">
                        Categoria
                      </label>
                      <div className="relative">
                        <select
                          value={form.watch("category") || ""}
                          onChange={(e) => form.setValue("category", e.target.value)}
                          className="w-full h-16 bg-[#1C1C1E] border border-zinc-800 rounded-2xl px-6 outline-none focus:border-[#2952FF] appearance-none text-sm font-bold text-zinc-300 cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {["MTB", "Speed / Road", "Gravel", "Urban / Cidade", "BMX", "Elétrica", "Infantil", "Dobrável", "Cargo", "Touring"].map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 rotate-90 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <SmallInput
                      label="SKU — editável após criação"
                      placeholder="Gerado automaticamente"
                      {...form.register("sku")}
                    />
                  )}

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-[#2952FF] transition-colors">
                      Descrição da Oferta
                    </label>
                    <textarea
                      {...form.register("description")}
                      className="w-full h-40 bg-[#1C1C1E] border border-zinc-800 rounded-[28px] p-6 text-sm text-zinc-400 outline-none focus:border-[#2952FF] transition-all resize-none leading-relaxed"
                      placeholder="Conte sobre a performance, estado de conservação e upgrades..."
                    />
                  </div>
                </div>
              </div>

              {/* Build & Componentes */}
              <div className="bg-[#161618] border border-zinc-800 rounded-[40px] p-10 shadow-2xl">
                <SectionHeader
                  title="Build & Componentes"
                  icon={Wrench}
                  subtitle="Mapeie as peças vinculadas para obter o custo de inventário preciso."
                />

                {/* Cost mode toggle */}
                <div className="flex p-1 bg-[#0A0A0B] border border-zinc-800 rounded-2xl mb-8">
                  <button
                    type="button"
                    onClick={() => form.setValue("cost_mode", "fixed")}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      costMode === "fixed"
                        ? "bg-[#2C2C2E] text-white shadow-xl"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Custo Direto (Fixo)
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue("cost_mode", "manual")}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      costMode === "manual"
                        ? "bg-[#2C2C2E] text-white shadow-xl"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Custo Composto (Peças)
                  </button>
                </div>

                {/* Fixed cost */}
                {costMode === "fixed" && (
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-[#2952FF] transition-colors">
                      Preço de Custo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={costPrice || ""}
                      onChange={(e) =>
                        form.setValue("cost_price", parseFloat(e.target.value) || 0)
                      }
                      className="w-full h-16 bg-[#1C1C1E] border border-zinc-800 rounded-2xl px-6 text-xl font-bold text-white outline-none focus:border-[#2952FF] transition-all"
                      placeholder="0,00"
                    />
                  </div>
                )}

                {/* Manual parts */}
                {costMode === "manual" && (
                  <div className="space-y-4">
                    {templateParts.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-8 text-center">
                        Nenhuma peça adicionada
                      </p>
                    ) : (
                      templateParts.map((tp) => (
                        <div
                          key={tp.key}
                          className="group flex items-start gap-4 p-6 bg-[#0A0A0B] border border-zinc-800 rounded-[32px] hover:border-zinc-700 transition-all"
                        >
                          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-600 border border-zinc-800 shrink-0">
                            <Layers size={20} />
                          </div>
                          <div className="flex-1 space-y-3 min-w-0">
                            <PartSelector
                              parts={allParts}
                              selectedPartId={tp.part_id}
                              customName={tp.part_name_override}
                              onSelectPart={(partId) => handleSelectPart(tp.key, partId)}
                              onCustomName={(name) =>
                                updateRow(tp.key, {
                                  part_id: null,
                                  part_name_override: name,
                                })
                              }
                            />
                            <div className="flex gap-3">
                              <div className="w-20">
                                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  Qtd
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={tp.quantity}
                                  onChange={(e) =>
                                    updateRow(tp.key, {
                                      quantity: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-sm font-bold text-white outline-none focus:border-[#2952FF] transition-all"
                                />
                              </div>
                              <div className="w-36">
                                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  Custo unit. (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={tp.unit_cost || ""}
                                  onChange={(e) =>
                                    updateRow(tp.key, {
                                      unit_cost: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-sm font-bold text-white outline-none focus:border-[#2952FF] transition-all"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  Subtotal
                                </label>
                                <div className="h-10 flex items-center text-sm font-bold text-[#2952FF]">
                                  {formatBRL(tp.unit_cost * tp.quantity)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(tp.key)}
                            className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0 mt-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}

                    {/* Total */}
                    {templateParts.length > 0 && (
                      <div className="flex justify-between items-center px-6 py-4 bg-[#0A0A0B] border border-zinc-800 rounded-[28px]">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                          Custo Total das Peças
                        </span>
                        <span className="text-xl font-black text-white">
                          {formatBRL(manualCost)}
                        </span>
                      </div>
                    )}

                    {/* Add row */}
                    <button
                      type="button"
                      onClick={addRow}
                      className="w-full rounded-[32px] border-dashed border-2 border-zinc-800 py-10 flex flex-col items-center justify-center gap-3 hover:bg-[#2952FF]/5 hover:border-[#2952FF]/50 transition-all group"
                    >
                      <Plus
                        size={24}
                        className="text-[#2952FF] group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-300">
                        Vincular Novo Componente
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-8">

              {/* Financeiro */}
              <div className="bg-[#161618] border border-zinc-800 rounded-[40px] p-8 shadow-2xl space-y-6">
                <SectionHeader title="Financeiro" icon={DollarSign} />

                {/* PIX price */}
                <div className="p-8 bg-[#0A0A0B] border border-zinc-800 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-[0.05] text-zinc-600 group-hover:rotate-12 transition-transform duration-700">
                    <DollarSign size={120} />
                  </div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
                    Preço PIX / Dinheiro
                  </label>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-xl font-bold text-[#2952FF]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="bg-transparent border-none outline-none text-4xl font-black text-white w-full tracking-tighter"
                      value={pixPrice || ""}
                      onChange={(e) =>
                        form.setValue("pix_price", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </div>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2">
                    Preço com desconto para pagamento à vista
                  </p>
                </div>

                {/* Installment */}
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[28px] space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      Parcelamento no Cartão
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        Valor da Parcela
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={installmentPrice || ""}
                        onChange={(e) =>
                          form.setValue(
                            "installment_price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full h-11 bg-[#1C1C1E] border border-zinc-800 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        Nº Parcelas
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={installmentCount}
                        onChange={(e) =>
                          form.setValue(
                            "installment_count",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-full h-11 bg-[#1C1C1E] border border-zinc-800 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  {installmentPrice > 0 && (
                    <p className="text-2xl font-black text-white">
                      {installmentCount}x{" "}
                      <span className="text-sm font-bold text-zinc-500">de</span>{" "}
                      {formatBRL(installmentPrice)}
                    </p>
                  )}
                </div>
              </div>

              {/* Ficha Técnica */}
              <div className="bg-[#161618] border border-zinc-800 rounded-[40px] p-8 shadow-2xl space-y-6">
                <SectionHeader title="Ficha Técnica" icon={Maximize2} />
                <div className="space-y-4">
                  <SmallInput
                    label="Marca de Origem"
                    placeholder="Ex: Caloi, Trek, Specialized"
                    {...form.register("brand")}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <SmallInput
                      label="Tamanho Quadro"
                      placeholder="Ex: M, 17"
                      {...form.register("frame_size")}
                    />
                    <SmallInput
                      label="Aro"
                      placeholder="Ex: 29, 700c"
                      {...form.register("rim_size")}
                    />
                  </div>
                  <SmallInput
                    label="Cor do Modelo"
                    placeholder="Ex: Preto, Vermelho"
                    {...form.register("color")}
                  />
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1 group-focus-within:text-[#2952FF] transition-colors">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={form.watch("weight_kg") ?? ""}
                      onChange={(e) =>
                        form.setValue("weight_kg", parseFloat(e.target.value) || undefined)
                      }
                      className="w-full h-12 bg-[#1C1C1E] border border-zinc-800 rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-[#2952FF] transition-all"
                      placeholder="Ex: 12.5"
                    />
                  </div>
                </div>

                <div className="h-px bg-zinc-800" />

                {/* Estoque */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#2952FF]/10 flex items-center justify-center text-[#2952FF]">
                      <Box size={16} />
                    </div>
                    <h4 className="text-sm font-black text-white tracking-tight italic uppercase">
                      Logística
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        Estoque Atual
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.watch("stock_qty")}
                        onChange={(e) =>
                          form.setValue("stock_qty", parseInt(e.target.value) || 0)
                        }
                        className="w-full h-12 bg-[#1C1C1E] border border-zinc-800 rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-[#2952FF] transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        Alerta Mín.
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.watch("alert_stock")}
                        onChange={(e) =>
                          form.setValue("alert_stock", parseInt(e.target.value) || 0)
                        }
                        className="w-full h-12 bg-[#1C1C1E] border border-zinc-800 rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-[#820AD1] transition-all"
                        placeholder="Ex: 2"
                      />
                    </div>
                  </div>

                  {/* Visibilidade toggle */}
                  <div className="flex items-center justify-between p-5 bg-[#0A0A0B] border border-zinc-800 rounded-[28px] hover:border-[#820AD1]/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Eye size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Exibir na Loja</p>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
                          Vitrine Online
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch("visible_on_storefront")}
                      onCheckedChange={(val) =>
                        form.setValue("visible_on_storefront", val)
                      }
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
