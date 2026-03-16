import { useState, useMemo } from "react";
import { Plus, Pencil, Eye, EyeOff, Tag, Trash2, X } from "lucide-react";
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, type Promotion } from "@/hooks/usePromotions";
import { useParts } from "@/hooks/useParts";
import { useBikeModels } from "@/hooks/useBikes";
import { useCategories } from "@/hooks/useCategories";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/format";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type FilterType = "Todas" | "Ativas" | "Agendadas" | "Expiradas";

function getStatus(p: Promotion): "active" | "scheduled" | "expired" | "inactive" {
  if (!p.active) return "inactive";
  const now = new Date();
  if (now < new Date(p.starts_at)) return "scheduled";
  if (now > new Date(p.ends_at)) return "expired";
  return "active";
}

function PromotionStatusBadge({ promotion }: { promotion: Promotion }) {
  const status = getStatus(promotion);
  if (status === "inactive") return <Badge className="bg-muted text-muted-foreground">Inativa</Badge>;
  if (status === "scheduled") return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Agendada</Badge>;
  if (status === "expired") return <Badge className="bg-muted text-muted-foreground">Expirada</Badge>;
  return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse">● Ativa</Badge>;
}

export default function Promocoes() {
  const { data: promotions = [], isLoading } = usePromotions();
  const { data: parts = [] } = useParts();
  const { data: bikes = [] } = useBikeModels();
  const { data: categories = [] } = useCategories();
  const { data: permsData } = useMyPermissions();
  const isAdmin = permsData?.isOwner ?? false;
  const { toast } = useToast();
  const createPromo = useCreatePromotion();
  const updatePromo = useUpdatePromotion();
  const deletePromo = useDeletePromotion();

  const [filter, setFilter] = useState<FilterType>("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [appliesTo, setAppliesTo] = useState<"product" | "category" | "both">("product");
  const [productId, setProductId] = useState<string>("");
  const [bikeModelId, setBikeModelId] = useState<string>("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<"pdv" | "ecommerce" | "both">("pdv");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const filtered = useMemo(() => {
    return promotions.filter((p) => {
      if (filter === "Todas") return true;
      const s = getStatus(p);
      if (filter === "Ativas") return s === "active";
      if (filter === "Agendadas") return s === "scheduled";
      if (filter === "Expiradas") return s === "expired" || s === "inactive";
      return true;
    });
  }, [promotions, filter]);

  const resetForm = () => {
    setName(""); setDescription(""); setDiscountType("percentage"); setDiscountValue(0);
    setAppliesTo("product"); setProductId(""); setBikeModelId(""); setCategory("");
    setScope("pdv"); setStartsAt(""); setEndsAt(""); setEditingPromo(null);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (p: Promotion) => {
    setEditingPromo(p);
    setName(p.name); setDescription(p.description || "");
    setDiscountType(p.discount_type); setDiscountValue(p.discount_value);
    setAppliesTo(p.applies_to); setProductId(p.product_id || "");
    setBikeModelId(p.bike_model_id || ""); setCategory(p.category || "");
    setScope(p.scope); 
    setStartsAt(p.starts_at.slice(0, 16)); setEndsAt(p.ends_at.slice(0, 16));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !startsAt || !endsAt) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: discountValue,
      applies_to: appliesTo,
      product_id: productId || null,
      bike_model_id: bikeModelId || null,
      category: category || null,
      scope,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      active: true,
    };
    try {
      if (editingPromo) {
        await updatePromo.mutateAsync({ id: editingPromo.id, ...payload });
        toast({ title: "Promoção atualizada" });
      } else {
        await createPromo.mutateAsync(payload as any);
        toast({ title: "Promoção criada" });
      }
      setModalOpen(false); resetForm();
    } catch {
      toast({ title: "Erro ao salvar promoção", variant: "destructive" });
    }
  };

  const toggleActive = async (p: Promotion) => {
    await updatePromo.mutateAsync({ id: p.id, active: !p.active });
  };

  const productName = (p: Promotion) => {
    if (p.product_id) return parts.find((pt) => pt.id === p.product_id)?.name || "Produto";
    if (p.bike_model_id) return bikes.find((b) => b.id === p.bike_model_id)?.name || "Bike";
    return p.category || "—";
  };

  if (isLoading) {
    return <div className="min-h-full bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <div className="max-w-3xl mx-auto w-full p-4 lg:p-8 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Tag size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-black">Promoções</h1>
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="h-9 px-3 text-xs font-bold rounded-xl bg-primary text-primary-foreground flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={14} /> Nova
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(["Todas", "Ativas", "Agendadas", "Expiradas"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 h-8 px-3 text-[10px] font-bold uppercase rounded-full border transition-all ${
                filter === f ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">Nenhuma promoção encontrada</div>
        ) : (
          filtered.map((promo) => (
            <div key={promo.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black truncate">{promo.name}</p>
                    <PromotionStatusBadge promotion={promo} />
                  </div>
                  {promo.description && <p className="text-xs text-muted-foreground">{promo.description}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => openEdit(promo)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => toggleActive(promo)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                      {promo.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-xl p-2">
                  <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Desconto</p>
                  <p className="text-sm font-black text-primary">
                    {promo.discount_type === "percentage" ? `${promo.discount_value}%` : formatBRL(promo.discount_value)}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-2">
                  <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Válido em</p>
                  <p className="text-xs font-bold">
                    {promo.scope === "pdv" ? "PDV" : promo.scope === "ecommerce" ? "E-commerce" : "PDV + E-commerce"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-2">
                  <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Aplica-se a</p>
                  <p className="text-xs font-bold truncate">{productName(promo)}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-2">
                  <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Validade</p>
                  <p className="text-xs font-bold">
                    {format(new Date(promo.starts_at), "dd/MM")} → {format(new Date(promo.ends_at), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-t-3xl md:rounded-2xl border border-border overflow-hidden">
            <div className="p-4 md:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">{editingPromo ? "Editar" : "Nova"} Promoção</h2>
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Nome *</p>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Black Friday..." className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary" />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Descrição</p>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional..." className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tipo</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDiscountType("percentage")} className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${discountType === "percentage" ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>%</button>
                    <button onClick={() => setDiscountType("fixed")} className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${discountType === "fixed" ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>R$</button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Valor</p>
                  {discountType === "percentage" ? (
                    <input type="number" min="1" max="100" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} placeholder="Ex: 10" className="w-full h-9 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary" />
                  ) : (
                    <CurrencyInput value={discountValue} onChange={setDiscountValue} className="!h-9 !rounded-xl" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Aplica-se a</p>
                <div className="flex gap-2 mb-2">
                  {([["product", "Produto"], ["category", "Categoria"], ["both", "Ambos"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setAppliesTo(v)} className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${appliesTo === v ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>{l}</button>
                  ))}
                </div>
                {(appliesTo === "product" || appliesTo === "both") && (
                  <select value={productId || bikeModelId} onChange={(e) => { const v = e.target.value; if (parts.find(p => p.id === v)) { setProductId(v); setBikeModelId(""); } else { setBikeModelId(v); setProductId(""); } }} className="w-full h-9 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary mb-2">
                    <option value="">Selecionar produto...</option>
                    <optgroup label="Peças">{parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                    <optgroup label="Bikes">{bikes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
                  </select>
                )}
                {(appliesTo === "category" || appliesTo === "both") && (
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary">
                    <option value="">Selecionar categoria...</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Válido em</p>
                <div className="flex gap-2">
                  {([["pdv", "PDV"], ["ecommerce", "E-commerce"], ["both", "Ambos"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setScope(v)} className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${scope === v ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Início *</p>
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full h-9 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Fim *</p>
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full h-9 bg-background border border-border rounded-xl px-3 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <button onClick={handleSave} disabled={createPromo.isPending || updatePromo.isPending} className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-50">
                {editingPromo ? "Salvar Alterações" : "Criar Promoção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
