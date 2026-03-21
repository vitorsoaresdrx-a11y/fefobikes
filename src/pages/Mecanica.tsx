import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { CustomerAutocomplete } from "@/components/CustomerAutocomplete";
import type { Customer } from "@/hooks/useCustomers";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import {
  useMechanicJobs,
  useMechanicJobsRealtime,
  useCreateMechanicJob,
  useAdvanceMechanicJob,
  useDeleteMechanicJob,
  useCreateAddition,
  useUpdateAdditionApproval,
  useRetreatMechanicJob,
  useUpdateMechanicJobDetails,
  useUpdateAddition,
  useDeleteAddition,
  useFinalizeJob,
  useRegisterPayment,
  type MechanicJob,
  type MechanicJobAddition,
  type AdditionPart,
  type MechanicJobPaymentHistory,
} from "@/hooks/useMechanicJobs";
import { useOSPhotos, useUploadPhoto, useDeletePhoto, type OSPhoto } from "@/hooks/useOSPhotos";
import { useSendMessage } from "@/hooks/useWhatsApp";
import {
  Wrench,
  Settings,
  CheckCircle2,
  Plus,
  ArrowRight,
  Phone,
  User,
  CreditCard,
  Trash2,
  Loader2,
  Clock,
  Check,
  X,
  AlertCircle,
  Activity,
  ChevronRight,
  ChevronLeft,
  Layers,
  History,
  TrendingUp,
  Search,
  AlertTriangle,
  Pencil,
  FileCheck,
  Tag,
  ChevronDown,
  Bike,
  HelpCircle,
  CheckCircle,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useParts } from "@/hooks/useParts";
import { useServiceOrdersRealtime, useCreateServiceOrder, type ServiceOrder } from "@/hooks/useServiceOrders";
import { playNotifySound, playAcceptSound } from "@/lib/sounds";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { formatBRL } from "@/lib/format";

function getAdditionTotal(a: MechanicJobAddition) {
  if (!a) return 0;
  const partsTotal = (a.parts_used || []).reduce(
    (sum, p) => sum + (Number(p?.quantity) || 0) * (Number(p?.unit_price) || 0),
    0
  );
  return Number(a.labor_cost || 0) + partsTotal;
}

function getTotalPrice(job: MechanicJob | null) {
  if (!job) return 0;
  if (job.sem_custo) return 0;
  const base = Number(job.price || 0);
  const accepted = (job.additions || [])
    .filter((a) => a?.approval === "accepted")
    .reduce((sum, a) => sum + getAdditionTotal(a), 0);
  return base + accepted;
}

const columns = [
  {
    key: "in_approval" as const,
    label: "Em Aprovação",
    icon: FileCheck,
    color: "text-yellow-400",
    bg: "bg-yellow-400/5",
    border: "border-yellow-400/20",
  },
  {
    key: "in_maintenance" as const,
    label: "Em Manutenção",
    icon: Settings,
    color: "text-indigo-400",
    bg: "bg-indigo-400/5",
    border: "border-indigo-400/20",
  },
  {
    key: "in_analysis" as const,
    label: "Em Análise",
    icon: Activity,
    color: "text-emerald-400",
    bg: "bg-emerald-400/5",
    border: "border-emerald-400/20",
  },
  {
    key: "ready" as const,
    label: "Pronto",
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">{label}</label>
      {children}
    </div>
  );
}

function PremiumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-12 bg-background border border-border/60 rounded-2xl px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
    />
  );
}

function PremiumTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-background border border-border/60 rounded-[32px] p-5 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full"
    />
  );
}

const PaymentBadge = ({ job }: { job: MechanicJob }) => {
  if (job.sem_custo) {
    return (
      <div className="bg-slate-500/10 text-slate-400 border-slate-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
        <Tag size={8} /> Sem custo
      </div>
    );
  }
  const total = getTotalPrice(job);
  const paid = Number(job.payment?.valor_pago || 0);
  const discount = Number((job.payment_history || []).reduce((s, h) => s + (Number(h?.desconto_valor) || 0), 0));
  const remaining = total - (paid + discount);

  if (remaining <= 0) {
    return (
      <div className="flex gap-1 items-center shrink-0">
        <div className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
          <CheckCircle size={8} /> Quitado
        </div>
        {discount > 0 && (
          <div className="bg-purple-500/10 text-purple-400 border-purple-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
             <Tag size={8} /> Desconto {formatBRL(discount)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 text-amber-500 border-amber-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
      <Clock size={8} /> Falta {formatBRL(remaining)}
    </div>
  );
};

function AdditionBadge({ addition, showActions }: { addition: MechanicJobAddition; showActions: boolean }) {
  const updateApproval = useUpdateAdditionApproval();
  const total = getAdditionTotal(addition);

  const handleApproval = (status: "accepted" | "refused") => {
    updateApproval.mutate({ id: addition.id, approval: status, is_v2: (addition as any).is_v2 });
  };

  const approvalColor =
    addition.approval === "accepted" ? "border-emerald-500/30 bg-emerald-500/5"
    : addition.approval === "refused" ? "border-destructive/30 bg-destructive/5"
    : "border-amber-500/30 bg-amber-500/5";

  return (
    <div className={`p-3 rounded-2xl border space-y-2 ${approvalColor}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground/90 truncate">{addition.problem}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-black text-primary">{formatBRL(total)}</span>
            {addition.approval === "accepted" && <span className="text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓ Aprovado</span>}
            {addition.approval === "refused" && <span className="text-[8px] font-black text-destructive uppercase bg-destructive/10 px-1.5 py-0.5 rounded-full">✗ Recusado</span>}
            {addition.approval === "pending" && <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded-full animate-pulse">⏳ Pendente</span>}
          </div>
        </div>
        {showActions && addition.approval === "pending" && (
          <div className="flex gap-1.5 ml-3 shrink-0">
            <button onClick={() => handleApproval("refused")} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-all" title="Recusar">
              <X size={14} />
            </button>
            <button onClick={() => handleApproval("accepted")} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all" title="Aprovar">
              <Check size={14} />
            </button>
          </div>
        )}
      </div>
      {(addition.parts_used || []).length > 0 && (
        <div className="pl-1 space-y-0.5 opacity-60">
          {addition.parts_used.map((p, i) => (
            <p key={i} className="text-[9px] font-medium leading-none">• {p.quantity}x {p.part_name}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, isLast, columnKey, onAddRepair, onEdit, onRetreat, onAdvance, onFinalize }: { job: MechanicJob; isLast: boolean; columnKey: string; onAddRepair: (j: MechanicJob) => void; onEdit: (j: MechanicJob) => void; onRetreat?: (j: MechanicJob) => void; onAdvance?: (j: MechanicJob) => void; onFinalize?: (j: MechanicJob) => void }) {
  const remove = useDeleteMechanicJob();
  const advanceMutation = useAdvanceMechanicJob();
  const total = getTotalPrice(job);
  const hasBike = !!job.bike_name;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const showApprovalActions = columnKey === "in_approval";
  const showRetreat = columnKey === "ready";

  const handleAdvance = () => {
    // If isLast (ready column) and onFinalize provided, open payment modal
    if (isLast && onFinalize) {
      onFinalize(job);
      return;
    }
    if (onAdvance) {
      onAdvance(job);
      return;
    }
    advanceMutation.mutate({ id: job.id, status: job.status }, {
      onSuccess: () => toast.success("Card avançado!"),
      onError: () => toast.error("Erro ao avançar")
    });
  };

  const handleConfirmDelete = () => {
    remove.mutate(job.id, {
      onSuccess: () => { toast.success("Serviço excluído"); setDeleteDialogOpen(false); },
      onError: () => toast.error("Erro ao excluir"),
    });
  };

  return (
    <>
      <div className="rounded-2xl bg-card border border-border/60 overflow-hidden mb-3 hover:border-primary/30 transition-all shadow-sm group">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-background border border-border/50 flex items-center justify-center shrink-0 shadow-sm group-hover:border-primary/20 transition-all">
              {hasBike ? <Bike size={16} className="text-primary" /> : <HelpCircle size={16} className="text-muted-foreground/60" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground truncate ">{job.bike_name || "Sem identificação"}</p>
                <PaymentBadge job={job} />
              </div>
              <p className="text-[10px] text-muted-foreground/70 font-medium truncate uppercase tracking-wider -mt-0.5">{job.customer_name || "Cliente avulso"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all" 
              onClick={() => onEdit(job)}
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all" 
              onClick={() => setDeleteDialogOpen(true)} 
              disabled={remove.isPending}
              title="Excluir"
            >
              {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {job.customer_whatsapp && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold bg-muted/40 w-fit px-2.5 py-1 rounded-full border border-border/50 uppercase tracking-widest">
              <Phone size={10} className="text-primary/60" /> {job.customer_whatsapp}
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap">{job.problem}</p>
          </div>

          {job.additions && job.additions.length > 0 && (
            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center gap-2 mb-2.5">
                <Settings size={12} className="text-muted-foreground/50" />
                <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-[0.2em]">Serviços Extras</span>
              </div>
              <div className="space-y-2">
                {job.additions.map((a) => <AdditionBadge key={a.id} addition={a} showActions={showApprovalActions} />)}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 px-4 py-3 bg-muted/10 border-t border-border/40">
          <div className="flex flex-col min-w-fit shrink-0">
            <span className="text-[9px] uppercase font-bold text-muted-foreground/42 tracking-widest truncate">Valor OS</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-foreground leading-none truncate">{formatBRL(total)}</span>
              {job.payment?.tipo === 'integral' && (
                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/20">Quitado</span>
              )}
              {job.payment?.tipo === 'parcial' && (Number(job.payment?.valor_restante) || 0) > 0 && (
                <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/20">Falta {formatBRL(Number(job.payment?.valor_restante) || 0)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <button 
              onClick={() => onAddRepair(job)} 
              className="w-9 h-9 rounded-xl bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:shadow-sm transition-all shadow-inner"
              title="Adicionar Reparo"
            >
              <Plus size={16} />
            </button>
            
            {showRetreat && onRetreat && (
              <button 
                onClick={() => onRetreat(job)} 
                className="h-9 px-2.5 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-black flex items-center gap-1 transition-all border border-amber-500/20 uppercase shadow-sm"
              >
                <ChevronLeft size={14} /> <span className="hidden lg:inline xl:hidden 2xl:inline">Voltar</span>
              </button>
            )}
            
            <button 
              onClick={handleAdvance} 
              disabled={advanceMutation.isPending} 
              className={`h-9 px-3 rounded-xl shadow-lg text-white text-[10px] font-black flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider ${isLast ? "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600" : "bg-primary shadow-primary/20 hover:bg-primary/90"}`}
            >
              {advanceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : (
                isLast ? <><span className="hidden lg:inline xl:hidden 2xl:inline">Finalizar</span> <Check size={14} /></> : <><span className="hidden lg:inline xl:hidden 2xl:inline">Avançar</span> <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Confirmar exclusão"
        description={`Tem certeza que deseja excluir o serviço "${job.bike_name || "Bike não informada"}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
}

function AddRepairPartSelector({ selectedParts, onChange }: { selectedParts: AdditionPart[]; onChange: (parts: AdditionPart[]) => void }) {
  const { data: parts = [] } = useParts();
  const [search, setSearch] = useState("");

  const filtered = search.length >= 2 
    ? (parts as any[]).filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    : [];

  const addPart = (p: any) => {
    if (selectedParts.some(sp => sp.part_id === p.id)) return;
    onChange([...selectedParts, { part_id: p.id, part_name: p.name, quantity: 1, unit_price: p.sale_price || 0 }]);
    setSearch("");
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <PremiumInput placeholder="Buscar peça por nome ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-xl mt-2 shadow-xl max-h-48 overflow-y-auto">
            {filtered.map(p => (
              <button key={p.id} onClick={() => addPart(p)} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-muted border-b border-border/40 last:border-0 truncate">
                {p.name} — <span className="text-primary">{formatBRL(p.sale_price || 0)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedParts.length > 0 && (
        <div className="space-y-2">
          {selectedParts.map((p, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border border-border/40">
              <span className="text-[10px] font-bold flex-1 truncate">{p.part_name}</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={p.quantity} 
                  onChange={(e) => {
                    const next = [...selectedParts];
                    next[i].quantity = Number(e.target.value);
                    onChange(next);
                  }}
                  className="w-10 h-7 bg-background border border-border rounded-lg text-center text-[10px] font-bold"
                />
                <button 
                  onClick={() => onChange(selectedParts.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OSPhotosSection({ osId }: { osId: string }) {
  const { data: photos = [], isLoading } = useOSPhotos(osId);
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const [activeTab, setActiveTab] = useState<OSPhoto["tipo"]>("chegada");

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: OSPhoto["tipo"]) => {
    const file = e.target.files?.[0];
    if (file) {
      upload.mutate({ osId, file, tipo });
    }
  };

  const filteredPhotos = photos.filter(p => p.tipo === activeTab);

  const tabs: { key: OSPhoto["tipo"], label: string }[] = [
    { key: "chegada", label: "Chegada" },
    { key: "problema", label: "Problema" },
    { key: "finalizacao", label: "Fim" }
  ];

  return (
    <div className="space-y-4 border-t border-border/40 pt-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Documentação Fotográfica</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <label className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
          <Camera size={20} className="text-muted-foreground" />
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Tirar Foto</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFileChange(e, activeTab)} />
        </label>
        <label className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
          <ImageIcon size={20} className="text-muted-foreground" />
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Galeria</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(e, activeTab)} />
        </label>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-2xl bg-muted/20 animate-pulse" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filteredPhotos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border">
              <img src={p.url} alt="OS" className="w-full h-full object-cover" />
              <button 
                onClick={() => remove.mutate(p)}
                className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {filteredPhotos.length === 0 && (
            <div className="col-span-3 py-6 text-center border border-dashed border-border/20 rounded-2xl opacity-30">
              <p className="text-[8px] font-bold uppercase tracking-widest">Nenhuma foto em "{tabs.find(t => t.key === activeTab)?.label}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColumnHeader({ label, icon: Icon, color, bg, border, count }: any) {
  return (
    <div className="flex items-center justify-between px-3 py-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl ${bg} ${border} border flex items-center justify-center`}>
          <Icon size={14} className={color} />
        </div>
        <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{label}</h3>
      </div>
      <span className="text-[10px] font-black text-muted-foreground/40 bg-muted/20 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

function EditJobModal({ open, onOpenChange, editJob, editForm, setEditForm, onSave, isSaving, onRegisterPayment, onShowReceipt }: any) {
  const deleteAddition = useDeleteAddition();
  const updateAddition = useUpdateAddition();
  const updateApproval = useUpdateAdditionApproval();
  const [editingAddition, setEditingAddition] = useState<string | null>(null);
  const [additionEdits, setAdditionEdits] = useState<Record<string, { problem: string; labor_cost: number; parts: AdditionPart[] }>>({});
  const [deleteAdditionDialog, setDeleteAdditionDialog] = useState<{ open: boolean; id: string; name: string; is_v2?: boolean }>({ open: false, id: "", name: "" });

  const startEditAddition = (a: MechanicJobAddition) => {
    setAdditionEdits((prev) => ({ ...prev, [a.id]: { problem: a.problem, labor_cost: a.labor_cost, parts: a.parts_used || [] } }));
    setEditingAddition(a.id);
  };

  const saveAddition = (a: MechanicJobAddition) => {
    const edits = additionEdits[a.id];
    if (!edits) return;
    const partsTotal = edits.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);
    updateAddition.mutate({ id: a.id, problem: edits.problem, price: edits.labor_cost + partsTotal, labor_cost: edits.labor_cost, parts_used: edits.parts, is_v2: (a as any).is_v2 }, {
      onSuccess: () => { toast.success("Reparo atualizado"); setEditingAddition(null); },
      onError: () => toast.error("Erro ao atualizar reparo"),
    });
  };

  const confirmDeleteAddition = () => {
    deleteAddition.mutate({ id: deleteAdditionDialog.id, is_v2: deleteAdditionDialog.is_v2 }, {
      onSuccess: () => { toast.success("Reparo excluído"); setDeleteAdditionDialog({ open: false, id: "", name: "" }); },
      onError: () => toast.error("Erro ao excluir reparo"),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Editar Serviço</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <InputGroup label="Nome da Bike *">
                <PremiumInput placeholder="Ex: Caloi Elite Carbon" value={editForm.bike_name} onChange={(e) => setEditForm((f: any) => ({ ...f, bike_name: e.target.value }))} />
              </InputGroup>
              <InputGroup label="Cliente">
                <CustomerAutocomplete
                  customerName={editForm.customer_name}
                  customerWhatsapp={editForm.customer_whatsapp}
                  customerCpf={editForm.customer_cpf}
                  onSelect={(c: Customer) => setEditForm((f: any) => ({ ...f, customer_name: c.name, customer_whatsapp: c.whatsapp || "", customer_cpf: c.cpf || "", customer_id: c.id }))}
                  onChange={(field, value) => {
                    const key = field === "name" ? "customer_name" : field === "whatsapp" ? "customer_whatsapp" : "customer_cpf";
                    setEditForm((f: any) => ({ ...f, [key]: value }));
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <PremiumInput placeholder="Nome completo" value={editForm.customer_name} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_name: e.target.value }))} />
                  <PremiumInput placeholder="(00) 00000-0000" value={editForm.customer_whatsapp} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_whatsapp: maskPhone(e.target.value) }))} />
                  <PremiumInput placeholder="CPF / CNPJ" value={editForm.customer_cpf} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_cpf: maskCpfCnpj(e.target.value) }))} />
                </div>
              </InputGroup>
              <InputGroup label="Diagnóstico *">
                <PremiumTextarea rows={4} placeholder="Descreva o que precisa ser feito..." value={editForm.problem} onChange={(e) => setEditForm((f: any) => ({ ...f, problem: e.target.value }))} />
              </InputGroup>
              <InputGroup label="Mover para coluna">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "in_approval", label: "Em Aprovação" },
                    { key: "in_repair", label: "Na Mecânica" }, // user asked for "Em Manutenção" in instructions but current column label is "Na Mecânica"
                    { key: "in_analysis", label: "Em Análise" },
                    { key: "ready", label: "Pronto" },
                  ].map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => setEditForm((f: any) => ({ ...f, status: col.key }))}
                      className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        editForm.status === col.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {editForm.status === col.key && <Check size={10} />}
                      {col.label}
                    </button>
                  ))}
                </div>
              </InputGroup>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <p className="text-xs font-black uppercase tracking-tight text-foreground">Serviço sem custo</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Não haverá cobrança de peças ou mão de obra</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm((f: any) => ({ ...f, sem_custo: !f.sem_custo }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${editForm.sem_custo ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editForm.sem_custo ? "left-7" : "left-1"}`} />
                </button>
              </div>

              {!editForm.sem_custo && (
                <InputGroup label="Valor do Serviço">
                  <CurrencyInput value={editForm.price} onChange={(val) => setEditForm((f: any) => ({ ...f, price: val }))} />
                </InputGroup>
              )}

              {!editForm.sem_custo && (
                <div className="space-y-4 border-t border-border/40 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Histórico de Pagamentos</p>
                    <button 
                      onClick={() => onRegisterPayment(editJob)}
                      className="h-8 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-1.5"
                    >
                      <Plus size={12} /> Registrar Pagamento
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editJob?.payment_history || []).length > 0 ? (
                      editJob.payment_history!.map((h: any) => (
                        <div key={h.id} className="p-3 bg-background rounded-xl border border-border flex items-center justify-between group/pay">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.tipo === 'desconto' ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {h.tipo === 'desconto' ? <Trash2 size={14} /> : <CreditCard size={14} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {h.tipo === 'desconto' ? `Desconto: ${formatBRL(h.desconto_valor)}` : formatBRL(h.valor)}
                                <span className="text-[8px] uppercase tracking-widest ml-2 opacity-40 font-black">{h.payment_method || (h.tipo === 'desconto' ? 'CORTESIA' : 'N/A')}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">{new Date(h.criado_em).toLocaleDateString()}</p>
                              {h.desconto_motivo && <p className="text-[10px] text-purple-400 font-bold mt-0.5">Motivo: {h.desconto_motivo}</p>}
                            </div>
                          </div>
                          <button 
                            onClick={() => onShowReceipt(editJob!, h)}
                            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground flex items-center justify-center transition-all"
                          >
                            <Phone size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center border-2 border-dashed border-border/40 rounded-2xl opacity-30">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum pagamento registrado</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-muted/20 rounded-2xl space-y-2 border border-border/20">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Total do Serviço</span>
                      <span className="text-foreground">{formatBRL(getTotalPrice(editJob))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Total Pago</span>
                      <span className="text-emerald-400 font-black">{formatBRL((editJob?.payment_history || []).reduce((s, h) => s + (Number(h?.valor) || 0), 0))}</span>
                    </div>
                    {(editJob?.payment_history || []).some(h => (Number(h?.desconto_valor) || 0) > 0) && (
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-purple-400">
                        <span>Total Descontos</span>
                        <span className="font-black">{formatBRL((editJob?.payment_history || []).reduce((s, h) => s + (Number(h?.desconto_valor) || 0), 0))}</span>
                      </div>
                    )}
                    <div className="h-px bg-border/40 my-1" />
                    <div className="flex justify-between items-center text-xs font-black uppercase">
                      <span>Saldo Restante</span>
                      <span className={getTotalPrice(editJob) - ((editJob?.payment_history || []).reduce((s, h) => s + (Number(h?.valor) || 0) + (Number(h?.desconto_valor) || 0), 0)) <= 0 ? "text-emerald-400" : "text-amber-500"}>
                        {formatBRL(Math.max(0, getTotalPrice(editJob) - ((editJob?.payment_history || []).reduce((s, h) => s + (Number(h?.valor) || 0) + (Number(h?.desconto_valor) || 0), 0))))}
                      </span>
                    </div>
                  </div>

                  <OSPhotosSection osId={editJob!.id} />
                </div>
              )}

              {editJob && editJob.additions && editJob.additions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Reparos Extras ({editJob.additions.length})</p>
                  {editJob.additions.map((a: MechanicJobAddition) => {
                    const isEditing = editingAddition === a.id;
                    const edits = additionEdits[a.id];
                    return (
                      <div key={a.id} className="p-3 bg-background rounded-xl border border-border space-y-2">
                        {isEditing && edits ? (
                          <>
                            <PremiumInput placeholder="Descrição do reparo" value={edits.problem} onChange={(e) => setAdditionEdits((prev) => ({ ...prev, [a.id]: { ...prev[a.id], problem: e.target.value } }))} />
                            <InputGroup label="Peças">
                              <AddRepairPartSelector selectedParts={edits.parts} onChange={(parts) => setAdditionEdits((prev) => ({ ...prev, [a.id]: { ...prev[a.id], parts } }))} />
                            </InputGroup>
                            <InputGroup label="Mão de Obra">
                              <CurrencyInput value={edits.labor_cost} onChange={(val) => setAdditionEdits((prev) => ({ ...prev, [a.id]: { ...prev[a.id], labor_cost: val } }))} />
                            </InputGroup>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => setEditingAddition(null)} className="flex-1 h-8 rounded-xl border border-border text-muted-foreground hover:bg-muted text-xs font-bold transition-all">Cancelar</button>
                              <button onClick={() => saveAddition(a)} disabled={updateAddition.isPending} className="flex-1 h-8 rounded-xl bg-primary text-white hover:bg-primary/80 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                                {updateAddition.isPending ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Salvar</>}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground truncate">{a.problem}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatBRL(getAdditionTotal(a))}
                                  {a.approval === "accepted" && " ✅"}
                                  {a.approval === "refused" && " ❌"}
                                  {a.approval === "pending" && " ⏳"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => startEditAddition(a)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => setDeleteAdditionDialog({ open: true, id: a.id, name: a.problem, is_v2: (a as any).is_v2 })} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                              {['pending', 'accepted', 'refused'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    const approval = status as any;
                                    updateApproval.mutate({ id: a.id, approval, is_v2: (a as any).is_v2 });
                                  }}
                                  className={`flex-1 h-7 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                    a.approval === (status === 'accepted' ? 'accepted' : status === 'refused' ? 'refused' : 'pending')
                                      ? status === 'accepted' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" 
                                        : status === 'refused' ? "border-destructive bg-destructive/10 text-destructive"
                                        : "border-amber-500 bg-amber-500/10 text-amber-500"
                                      : "border-border bg-card text-muted-foreground opacity-50"
                                  }`}
                                >
                                  {status === 'pending' ? 'Pendente' : status === 'accepted' ? 'Aprovado' : 'Negado'}
                                </button>
                              ))}
                            </div>
                            {(a.parts_used || []).length > 0 && (
                              <div className="pl-2 space-y-0.5">
                                {a.parts_used.map((p, i) => (
                                  <p key={i} className="text-[9px] text-muted-foreground">{p.quantity}x {p.part_name} — {formatBRL(p.quantity * p.unit_price)}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-4 pt-6 md:pt-8 bg-secondary sticky bottom-0 border-t border-border">
              <button onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all">Cancelar</button>
              <button onClick={onSave} disabled={isSaving} className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Salvar Alterações</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog open={deleteAdditionDialog.open} onOpenChange={(o) => setDeleteAdditionDialog((prev) => ({ ...prev, open: o }))} onConfirm={confirmDeleteAddition} title="Excluir Reparo Adicional" description={`Deseja excluir o reparo "${deleteAdditionDialog.name}"?`} />
    </>
  );
}

export default function Mecanica() {
  useMechanicJobsRealtime();
  const { data: jobs = [], isLoading } = useMechanicJobs();
  const create = useCreateMechanicJob();
  const advance = useAdvanceMechanicJob();
  const retreat = useRetreatMechanicJob();
  const updateDetails = useUpdateMechanicJobDetails();
  const createAddition = useCreateAddition();
  const deleteAddition = useDeleteAddition();
  const updateAddition = useUpdateAddition();
  const finalize = useFinalizeJob();
  const createServiceOrder = useCreateServiceOrder();
  const sendMessage = useSendMessage();

  const handleServiceOrderDone = useCallback(async (order: ServiceOrder) => {
    playNotifySound();
    await supabase.from("mechanic_jobs" as any).update({ status: "in_analysis" }).eq("id", order.id);
    toast.success(`🔧 ${order.bike_name || "Bike"} pronta pra entrega! (Em Análise)`, { duration: 8000 });
  }, []);

  const handleServiceOrderAccepted = useCallback(async (order: ServiceOrder) => {
    playAcceptSound();
    await supabase.from("mechanic_jobs" as any).update({ status: "in_maintenance" }).eq("id", order.id);
    toast.info(`⚙️ ${order.bike_name || "OS"} aceita por ${order.mechanic_name || "mecânico"}`, { duration: 5000 });
  }, []);

  useServiceOrdersRealtime({ onDone: handleServiceOrderDone, onAccepted: handleServiceOrderAccepted });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    bike_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    problem: "",
    price: 0,
    initialStatus: "in_approval" as "in_approval" | "in_repair",
    paymentType: "nenhum" as "integral" | "parcial" | "nenhum",
    paymentAmount: 0,
    paymentMethod: "pix",
    status: "in_approval" as MechanicJob["status"],
    sem_custo: false,
  });

  const [mechanicCardOpen, setMechanicCardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addJob, setAddJob] = useState<MechanicJob | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState<{ job: any, status: string, problem: string } | null>(null);

  // Realtime listener for extra services
  useEffect(() => {
    const channel = supabase
      .channel('os_adicionais_status_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'os_adicionais' },
        async (payload: any) => {
          if (payload.old.status === 'pending' && (payload.new.status === 'accepted' || payload.new.status === 'refused')) {
            // Fetch job info
            const { data: job } = await supabase.from('mechanic_jobs').select('*').eq('id', payload.new.os_id).single();
            if (job) {
              setNotifData({ job, status: payload.new.status, problem: payload.new.problem });
              setNotifOpen(true);
              // Play a sound if possible
              const audio = new Audio("https://cdn.pixabay.com/audio/2021/08/04/audio_bbdec30d20.mp3");
              audio.play().catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const [addForm, setAddForm] = useState({ problem: "", labor_cost: 0, parts: [] as AdditionPart[] });
  const [sendingAddition, setSendingAddition] = useState(false);
  const [mobileTab, setMobileTab] = useState<"in_approval" | "in_repair" | "in_maintenance" | "in_analysis" | "ready">("in_approval");

  const [editOpen, setEditOpen] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [pendingMoveStatus, setPendingMoveStatus] = useState<MechanicJob["status"] | null>(null);
  const [editJob, setEditJob] = useState<MechanicJob | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    bike_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    problem: "",
    price: 0,
    paymentType: "nenhum" as "integral" | "parcial" | "nenhum",
    paymentAmount: 0,
    paymentMethod: "pix",
    status: "in_approval" as MechanicJob["status"],
    sem_custo: false,
  });

  const [payHistoryOpen, setPayHistoryOpen] = useState(false);
  const [registerPayOpen, setRegisterPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    valor: 0,
    tipo: 'parcial' as 'parcial' | 'integral' | 'desconto',
    method: 'pix',
    desconto_valor: 0,
    desconto_motivo: ''
  });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{ job: MechanicJob, history: MechanicJobPaymentHistory } | null>(null);

  const registerPaymentMutation = useRegisterPayment();

  const handleRegisterPayment = (job: MechanicJob) => {
    setEditJob(job);
    const total = getTotalPrice(job);
    const paid = (job.payment_history || []).reduce((s, h) => s + (Number(h.valor) || 0) + (Number(h.desconto_valor) || 0), 0);
    const remaining = Math.max(0, total - paid);
    
    setPayForm({
      valor: remaining,
      tipo: remaining > 0 ? 'parcial' : 'integral',
      method: 'pix',
      desconto_valor: 0,
      desconto_motivo: ''
    });
    setRegisterPayOpen(true);
  };

  const submitPayment = () => {
    if (!editJob) return;

    // Enforce discount rule: only allowed if it clears the total
    const total = getTotalPrice(editJob);
    const alreadyCleared = (editJob.payment_history || []).reduce((s, h) => s + (Number(h.valor) || 0) + (Number(h.desconto_valor) || 0), 0);
    const newAmount = payForm.tipo === 'desconto' ? payForm.desconto_valor : payForm.valor;

    if (payForm.tipo === 'desconto' && (alreadyCleared + newAmount < total - 0.01)) { // 0.01 for float safety
      toast.error("Desconto manual só é permitido no pagamento que quita a OS");
      return;
    }

    registerPaymentMutation.mutate({
      os_id: editJob.id,
      valor: payForm.tipo === 'desconto' ? 0 : payForm.valor,
      tipo: payForm.tipo,
      payment_method: payForm.tipo === 'desconto' ? null : payForm.method,
      desconto_valor: payForm.tipo === 'desconto' ? payForm.desconto_valor : 0,
      desconto_motivo: payForm.tipo === 'desconto' ? payForm.desconto_motivo : null,
      customer_id: editJob.customer_id,
      customer_name: editJob.customer_name,
      customer_whatsapp: editJob.customer_whatsapp,
      bike_name: editJob.bike_name
    }, {
      onSuccess: () => {
        toast.success("Pagamento registrado!");
        setRegisterPayOpen(false);
      }
    });
  };

  const handleShowReceipt = (job: MechanicJob, history: MechanicJobPaymentHistory) => {
    setReceiptData({ job, history });
    setReceiptOpen(true);
  };

  // Modal de finalização com pagamento
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeJob, setFinalizeJob] = useState<MechanicJob | null>(null);
  const [finalizePaymentMethod, setFinalizePaymentMethod] = useState("pix");

  const grouped = useMemo(() => {
    const map: Record<string, MechanicJob[]> = { in_approval: [], in_repair: [], in_maintenance: [], in_analysis: [], ready: [] };
    jobs.forEach((j) => { if (map[j.status]) map[j.status].push(j); });
    return map;
  }, [jobs]);

  const handleSave = () => {
    if (!form.problem.trim()) { toast.error("Descreva o problema"); return; }
    const orderData = {
      customer_name: form.customer_name || undefined,
      customer_cpf: form.customer_cpf || undefined,
      customer_whatsapp: form.customer_whatsapp || undefined,
      customer_id: form.customer_id || undefined,
      bike_name: form.bike_name || undefined,
      problem: form.problem,
      price: form.sem_custo ? 0 : Number(form.price || 0),
      status: form.initialStatus,
      sem_custo: form.sem_custo,
      payment: (!form.sem_custo && form.paymentType !== 'nenhum') ? {
        tipo: form.paymentType,
        valor_pago: form.paymentType === 'integral' ? Number(form.price || 0) : Number(form.paymentAmount || 0),
        method: form.paymentMethod
      } : undefined
    };

    create.mutate(orderData as any, {
      onSuccess: (newJob) => {
        if (form.initialStatus === "in_repair") {
          createServiceOrder.mutate({ id: newJob.id, customer_name: form.customer_name || undefined, customer_cpf: form.customer_cpf || undefined, customer_whatsapp: form.customer_whatsapp || undefined, customer_id: form.customer_id || undefined, bike_name: form.bike_name || undefined, problem: form.problem });
        }
        if (form.customer_whatsapp) {
          const phone = form.customer_whatsapp.replace(/\D/g, "");
          const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
          sendMessage.mutate({ phone: formattedPhone, message: `Olá, ${form.customer_name || "cliente"}! Sua bicicleta ${form.bike_name ? `(${form.bike_name}) ` : ""}já está na mecânica. Quando algum mecânico começar o serviço, te avisaremos por aqui.` });
        }
        toast.success("Manutenção criada!");
        setForm({ customer_name: "", bike_name: "", customer_cpf: "", customer_whatsapp: "", customer_id: null, problem: "", price: 0, initialStatus: "in_approval", paymentType: "nenhum", paymentAmount: 0, paymentMethod: "pix", status: "in_approval" });
        setOpen(false);
      },
      onError: () => toast.error("Erro ao criar"),
    });
  };

  const handleAddRepair = (job: MechanicJob) => { setAddJob(job); setAddForm({ problem: "", labor_cost: 0, parts: [] }); setAddOpen(true); };
  const handleEditJob = (job: MechanicJob) => {
    setEditJob(job);
    setEditForm({ 
      customer_name: job.customer_name || "", 
      bike_name: job.bike_name || "", 
      customer_cpf: job.customer_cpf || "", 
      customer_whatsapp: job.customer_whatsapp || "", 
      customer_id: job.customer_id || null, 
      problem: job.problem || "", 
      price: Number(job.price || 0), 
      sem_custo: job.sem_custo || false,
      paymentType: job.payment?.tipo || "nenhum", 
      paymentAmount: job.payment?.valor_pago || 0, 
      paymentMethod: "pix",
      status: job.status
    });
    setEditOpen(true);
  };

  const handleSaveEdit = (confirmedMove = false) => {
    if (!editJob || !editForm.problem.trim()) { toast.error("Descreva o problema"); return; }
    
    // Check if status changed and not yet confirmed
    if (editForm.status !== editJob.status && !confirmedMove) {
      setPendingMoveStatus(editForm.status);
      setMoveConfirmOpen(true);
      return;
    }

    const doSave = async () => {
      // 1. Update Mechanic Job
      await updateDetails.mutateAsync({ 
        id: editJob.id, 
        customer_name: editForm.customer_name || null, 
        customer_cpf: editForm.customer_cpf || null, 
        customer_whatsapp: editForm.customer_whatsapp || null, 
        customer_id: editForm.customer_id || null, 
        bike_name: editForm.bike_name || null, 
        problem: editForm.problem || "", 
        price: editForm.sem_custo ? 0 : Number(editForm.price || 0), 
        status: editForm.status,
        sem_custo: editForm.sem_custo,
        payment: { 
          tipo: editForm.paymentType, 
          valor_pago: editForm.paymentType === 'integral' ? Number(editForm.price || 0) : Number(editForm.paymentAmount || 0), 
          method: editForm.paymentMethod || "pix"
        } 
      });

      // 2. If moved manually, update WhatsApp conversation
      if (confirmedMove && editForm.customer_whatsapp) {
        const phone = editForm.customer_whatsapp.replace(/\D/g, "");
        const phoneSuffix = phone.length > 10 ? phone.slice(-10) : phone;
        
        const { data: convs } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .ilike('wa_id', `%${phoneSuffix}%`);
        
        if (convs && convs.length > 0) {
          await supabase
            .from('whatsapp_conversations')
            .update({ ai_enabled: false, human_takeover: true } as any)
            .eq('id', convs[0].id);
        }
      }

      toast.success("Serviço atualizado!");
      setEditOpen(false);
      setEditJob(null);
      setMoveConfirmOpen(false);
      setPendingMoveStatus(null);
    };

    doSave().catch(() => toast.error("Erro ao atualizar"));
  };

  const handleAdvanceJob = (job: MechanicJob) => {
    const phone = job.customer_whatsapp?.replace(/\D/g, "");
    const formattedPhone = phone ? ((phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone) : null;

    advance.mutate({ id: job.id, status: job.status }, {
      onSuccess: () => {
        toast.success("Card avançado!");
        
        // Transitions logic
        if (job.status === "in_approval") {
          createServiceOrder.mutate({ id: job.id, customer_name: job.customer_name || undefined, customer_cpf: job.customer_cpf || undefined, customer_whatsapp: job.customer_whatsapp || undefined, customer_id: job.customer_id || undefined, bike_name: job.bike_name || undefined, problem: job.problem, sem_custo: job.sem_custo });
        }

        // WhatsApp notifications
        if (formattedPhone) {
          let message = "";
          if (job.status === "in_approval") {
            message = `Olá, ${job.customer_name || "cliente"}! Sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}já está na mecânica. Quando algum mecânico começar o serviço, te avisaremos por aqui.`;
          } else if (job.status === "in_repair") {
            message = `Boas notícias, ${job.customer_name || "cliente"}! A manutenção da sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}acabou de começar! 🛠️`;
          } else if (job.status === "in_analysis") {
            message = `Olá, ${job.customer_name || "cliente"}! Sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}está prontinha para retirada! 🚲✨`;
          }

          if (message) {
            sendMessage.mutate({ phone: formattedPhone, message });
          }
        }
      },
      onError: () => toast.error("Erro ao mover card"),
    });
  };

  const handleRetreatJob = (job: MechanicJob) => { retreat.mutate({ id: job.id }, { onSuccess: () => toast.success("Retornado para 'Em Manutenção'"), onError: () => toast.error("Erro ao retroceder") }); };

  // Opens the finalize+payment modal instead of directly advancing
  const handleOpenFinalize = (job: MechanicJob) => {
    setFinalizeJob(job);
    setFinalizePaymentMethod("pix");
    setFinalizeOpen(true);
  };

  const handleConfirmFinalize = () => {
    if (!finalizeJob) return;
    const totalValue = getTotalPrice(finalizeJob);
    finalize.mutate({
      jobId: finalizeJob.id,
      totalValue,
      paymentMethod: finalizePaymentMethod,
      customerName: finalizeJob.customer_name,
      customerWhatsapp: finalizeJob.customer_whatsapp,
      customerCpf: finalizeJob.customer_cpf,
      customerId: finalizeJob.customer_id,
      bikeName: finalizeJob.bike_name,
      problem: finalizeJob.problem,
    }, {
      onSuccess: () => {
        toast.success(`✅ OS finalizada e registrada no DRE!`);
        setFinalizeOpen(false);
        setFinalizeJob(null);
      },
      onError: () => toast.error("Erro ao finalizar OS"),
    });
  };

  const { data: jobPhotos = [] } = useOSPhotos(addJob?.id);

  const handleSaveAddition = async () => {
    if (!addJob || !addForm.problem.trim()) { toast.error("Descreva o reparo"); return; }
    setSendingAddition(true);
    let savedRowId = null;

    try {
      // 1. Save Addition
      const partsTotal = addForm.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);
      const totalCost = addForm.labor_cost + partsTotal;

      const { data: adData, error: adErr } = await supabase.from("os_adicionais" as any).insert({
        os_id: addJob.id,
        problem: addForm.problem,
        price: totalCost,
        labor_cost: addForm.labor_cost,
        parts_used: addForm.parts,
        status: "rascunho"
      }).select().single();
      
      if (adErr) throw new Error("Falha ao criar o registro adicional.");
      savedRowId = (adData as any).id;

      // 2. Fetch formatted message
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("formatar-adicional", {
        body: {
          osId: addJob.id,
          pecas: addForm.parts,
          observacoes: addForm.problem,
          maoDeObra: addForm.labor_cost
        }
      });
      if (edgeErr || edgeData?.error) throw new Error(edgeErr?.message || edgeData?.error || "Insucesso na Edge Function");

      // 3. Send media if there are "problema" photos
      const problemPhotos = jobPhotos.filter(p => p.tipo === "problema");
      const phone = addJob.customer_whatsapp?.replace(/\D/g, "");
      const formattedPhone = phone ? ((phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone) : null;

      if (formattedPhone) {
        for (const photo of problemPhotos) {
          await sendMessage.mutateAsync({
            phone: formattedPhone,
            media: photo.url,
            mediatype: 'image'
          });
        }
        // 4. Send formatted message
        await sendMessage.mutateAsync({ phone: formattedPhone, message: edgeData.message });
      }

      await advance.mutateAsync({ id: addJob.id, status: addJob.status });

      toast.success("Enviado para o cliente com sucesso!");
      setAddOpen(false);
      setAddJob(null);
    } catch (err: any) {
      if (savedRowId) {
        await supabase.from("os_adicionais" as any).delete().eq("id", savedRowId);
      }
      toast.error("Erro no envio: " + err.message);
    } finally {
      setSendingAddition(false);
    }
  };

  const pendingApprovals = jobs.filter((j) => j.additions?.some((a) => a.approval === "pending")).length;
  const avgTicket = jobs.length > 0 ? jobs.reduce((sum, j) => sum + getTotalPrice(j), 0) / jobs.length : 0;

  const allMobileTabs = [
    { key: "in_approval" as const, label: "Em Aprovação", icon: FileCheck, color: "text-yellow-400", bg: "bg-yellow-400/5", border: "border-yellow-400/20" },
    { key: "in_repair" as const, label: "Na Mecânica", icon: Wrench, color: "text-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/20" },
    ...columns.slice(1),
  ];

  return (
    <div className="min-h-full bg-background text-foreground selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="w-full min-w-0 p-4 md:p-6 space-y-6 md:space-y-10 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30 shrink-0">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground uppercase tracking-tighter italic leading-none">Oficina</h1>
            </div>
            <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] ml-1">Gerenciamento de Manutenções</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-card border border-border/40 px-4 py-2.5 rounded-2xl">
              <Activity size={14} className="text-primary" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">Ticket Médio</span>
                <span className="text-sm font-black text-foreground">{formatBRL(avgTicket)}</span>
              </div>
            </div>
            <button onClick={() => setOpen(true)} className="h-12 md:h-14 px-6 md:px-8 bg-primary text-white rounded-[20px] md:rounded-[24px] text-xs font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all flex items-center gap-3 shadow-xl shadow-primary/20 active:scale-95">
              <Plus size={18} /> <span className="hidden sm:inline">Nova O.S</span><span className="sm:hidden">Nova</span>
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-96 rounded-3xl bg-muted/20 animate-pulse border border-border/20" />)}
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto gap-2 pb-2 md:hidden scrollbar-hide -mx-4 px-4">
              {allMobileTabs.map((tab) => (
                <button key={tab.key} onClick={() => setMobileTab(tab.key as any)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${mobileTab === tab.key ? `${tab.bg} ${tab.color} ${tab.border} shadow-lg shadow-black/5` : "bg-card text-muted-foreground border-border/40"}`}>
                  <tab.icon size={14} /> {tab.label}
                  <span className="opacity-40 ml-1">{grouped[tab.key]?.length || 0}</span>
                </button>
              ))}
            </div>

            <div className="md:hidden">
              <div className="space-y-4">
                {(grouped[mobileTab]?.length || 0) > 0 ? (
                  grouped[mobileTab]?.map((job) => (
                    <JobCard key={job.id} job={job} isLast={mobileTab === "ready"} columnKey={mobileTab} onAddRepair={handleAddRepair} onEdit={handleEditJob} onRetreat={handleRetreatJob} onAdvance={mobileTab !== "ready" ? handleAdvanceJob : undefined} onFinalize={mobileTab === "ready" ? handleOpenFinalize : undefined} />
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3 opacity-20">
                    <Layers className="mx-auto" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Coluna Vazia</p>
                  </div>
                )}
              </div>
            </div>

            {grouped.in_repair.length > 0 && (
              <div className="hidden md:flex justify-center">
                <button onClick={() => setMechanicCardOpen(true)} className="bg-card/60 border border-amber-400/15 rounded-2xl px-5 py-2.5 flex items-center justify-center gap-2 hover:border-amber-400/30 transition-all">
                  <Wrench size={14} className="text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Na Mecânica ({grouped.in_repair.length})</span>
                </button>
              </div>
            )}

            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
              {columns.map((col) => (
                <div key={col.key} className="flex-1 min-w-0 flex flex-col bg-card/50 rounded-3xl p-2 border border-border/30">
                  <ColumnHeader {...col} count={grouped[col.key].length} />
                  <div className="px-1.5 space-y-3 pb-6 flex-1">
                    {grouped[col.key].length > 0 ? (
                      grouped[col.key].map((job) => (
                        <JobCard key={job.id} job={job} isLast={col.key === "ready"} columnKey={col.key} onAddRepair={handleAddRepair} onEdit={handleEditJob} onRetreat={handleRetreatJob} onAdvance={col.key !== "ready" ? handleAdvanceJob : undefined} onFinalize={col.key === "ready" ? handleOpenFinalize : undefined} />
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
                        <Layers className="mx-auto" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-3">Coluna Vazia</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal de Finalização com Pagamento ───────────────────────────────── */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-md shadow-2xl w-full">
          <div className="p-6 md:p-10 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Finalizar OS</DialogTitle>
            </DialogHeader>
            {finalizeJob && (
              <>
                <div className="p-4 bg-background rounded-2xl border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Serviço</p>
                  <p className="font-black text-foreground">{finalizeJob.bike_name || "Bike"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{finalizeJob.problem}</p>
                  <p className="text-xl font-black text-primary mt-2">{formatBRL(getTotalPrice(finalizeJob))}</p>
                </div>
                <InputGroup label="Forma de Pagamento *">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "pix", label: "PIX" },
                      { key: "dinheiro", label: "Dinheiro" },
                      { key: "cartao_debito", label: "Débito" },
                      { key: "cartao_credito", label: "Crédito" },
                    ].map((pm) => (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setFinalizePaymentMethod(pm.key)}
                        className={`h-12 rounded-xl border text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          finalizePaymentMethod === pm.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {finalizePaymentMethod === pm.key && <Check size={12} />}
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </InputGroup>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setFinalizeOpen(false)} className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all">Cancelar</button>
              <button
                onClick={handleConfirmFinalize}
                disabled={finalize.isPending}
                className="flex-[2] h-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {finalize.isPending ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirmar e Finalizar</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Nova Ordem de Serviço</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <InputGroup label="Nome da Bike *">
                <PremiumInput placeholder="Ex: Caloi Elite Carbon" value={form.bike_name} onChange={(e) => setForm((f) => ({ ...f, bike_name: e.target.value }))} />
              </InputGroup>
              <InputGroup label="Cliente">
                <CustomerAutocomplete
                  customerName={form.customer_name}
                  customerWhatsapp={form.customer_whatsapp}
                  customerCpf={form.customer_cpf}
                  onSelect={(c: Customer) => setForm((f: any) => ({ ...f, customer_name: c.name, customer_whatsapp: c.whatsapp || "", customer_cpf: c.cpf || "", customer_id: c.id }))}
                  onChange={(field, value) => {
                    const key = field === "name" ? "customer_name" : field === "whatsapp" ? "customer_whatsapp" : "customer_cpf";
                    setForm((f: any) => ({ ...f, [key]: value }));
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <PremiumInput placeholder="Nome completo" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
                  <PremiumInput placeholder="(00) 00000-0000" value={form.customer_whatsapp} onChange={(e) => setForm((f) => ({ ...f, customer_whatsapp: maskPhone(e.target.value) }))} />
                  <PremiumInput placeholder="CPF / CNPJ" value={form.customer_cpf} onChange={(e) => setForm((f) => ({ ...f, customer_cpf: maskCpfCnpj(e.target.value) }))} />
                </div>
              </InputGroup>
              <InputGroup label="Diagnóstico Inicial *">
                <PremiumTextarea rows={4} placeholder="Descreva o que precisa ser feito..." value={form.problem} onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))} />
              </InputGroup>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <p className="text-xs font-black uppercase tracking-tight text-foreground">Serviço sem custo</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Não haverá cobrança de peças ou mão de obra</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, sem_custo: !f.sem_custo }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.sem_custo ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.sem_custo ? "left-7" : "left-1"}`} />
                </button>
              </div>

              {!form.sem_custo && (
                <>
                  <InputGroup label="Valor do Serviço">
                    <CurrencyInput value={form.price} onChange={(val) => setForm((f) => ({ ...f, price: val }))} />
                  </InputGroup>

                  <InputGroup label="Pagamento Adiantado">
                    <div className="grid grid-cols-3 gap-3">
                      {['nenhum', 'parcial', 'integral'].map((type) => (
                        <button key={type} type="button" onClick={() => setForm((f: any) => ({ ...f, paymentType: type as any }))} className={`h-12 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${form.paymentType === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                          {type === 'integral' && <CheckCircle size={12} />}
                          {type === 'parcial' && <Clock size={12} />}
                          {type === 'nenhum' && <X size={12} />}
                          {type}
                        </button>
                      ))}
                    </div>
                    {form.paymentType === 'parcial' && (
                      <div className="mt-3">
                        <CurrencyInput value={form.paymentAmount} onChange={(val) => setForm((f: any) => ({ ...f, paymentAmount: val }))} />
                        <p className="text-[10px] text-muted-foreground mt-1 ml-1 font-bold italic">Valor recebido hoje</p>
                      </div>
                    )}
                  </InputGroup>
                </>
              )}

              <InputGroup label="Qual a situação? *">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm((f) => ({ ...f, initialStatus: "in_approval" }))} className={`h-14 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${form.initialStatus === "in_approval" ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                    <FileCheck size={16} /> Em Aprovação
                  </button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, initialStatus: "in_repair" }))} className={`h-14 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${form.initialStatus === "in_repair" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                    <Wrench size={16} /> Na Mecânica
                  </button>
                </div>
              </InputGroup>
              
              {form.paymentType !== 'nenhum' && (
                <InputGroup label="Forma de Pagamento *">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "pix", label: "PIX" },
                      { key: "dinheiro", label: "Dinheiro" },
                      { key: "cartao_debito", label: "Débito" },
                      { key: "cartao_credito", label: "Crédito" },
                    ].map((pm) => (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setForm((f: any) => ({ ...f, paymentMethod: pm.key }))}
                        className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          form.paymentMethod === pm.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {form.paymentMethod === pm.key && <Check size={10} />}
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </InputGroup>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={create.isPending} className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {create.isPending ? <Loader2 size={16} className="animate-spin" /> : "Abrir Serviço"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight italic">Registrar Reparo Extra</DialogTitle>
            </DialogHeader>
            {addJob && (
              <div className="space-y-6">
                <div className="p-5 bg-background rounded-[28px] border border-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Wrench size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white leading-none mb-1 truncate">{addJob.customer_name || "Cliente"}</p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{addJob.problem}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Valor atual: {formatBRL(getTotalPrice(addJob))}</p>
                  </div>
                </div>
                <InputGroup label="Problema / Descrição *">
                  <PremiumTextarea rows={2} placeholder="Ex: Troca de corrente e ajuste de câmbio..." value={addForm.problem} onChange={(e) => setAddForm((f) => ({ ...f, problem: e.target.value }))} />
                </InputGroup>
                <InputGroup label="Peças Utilizadas">
                  <AddRepairPartSelector selectedParts={addForm.parts} onChange={(parts) => setAddForm((f) => ({ ...f, parts }))} />
                </InputGroup>
                <InputGroup label="Mão de Obra">
                  <CurrencyInput value={addForm.labor_cost} onChange={(val) => setAddForm((f) => ({ ...f, labor_cost: val }))} />
                </InputGroup>
                <div className="p-4 bg-background rounded-2xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total deste reparo</span>
                    <span className="text-lg font-black text-white">{formatBRL(addForm.labor_cost + addForm.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0))}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAddOpen(false)} className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all">Cancelar</button>
              <button onClick={handleSaveAddition} disabled={sendingAddition || createAddition.isPending} className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {(sendingAddition || createAddition.isPending) ? <Loader2 size={16} className="animate-spin" /> : "Enviar para o Cliente"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditJobModal 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        editJob={editJob} 
        editForm={editForm} 
        setEditForm={setEditForm} 
        onSave={handleSaveEdit} 
        isSaving={updateDetails.isPending}
        onRegisterPayment={handleRegisterPayment}
        onShowReceipt={handleShowReceipt}
      />

      <Dialog open={moveConfirmOpen} onOpenChange={setMoveConfirmOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl p-6 md:p-10 max-w-md w-full">
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle size={32} className="text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Confirmar Movimentação</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao mover este card manualmente, a IA deixará de monitorar este atendimento automaticamente. 
                O acompanhamento passará a ser feito pelo atendente humano. Os demais cards continuam funcionando normalmente. 
                <br /><br />Deseja continuar?
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setMoveConfirmOpen(false);
                  setPendingMoveStatus(null);
                }} 
                className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted font-bold transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSaveEdit(true)} 
                className="flex-1 h-12 rounded-2xl bg-amber-500 text-white hover:bg-amber-400 font-black uppercase tracking-widest text-xs transition-all"
              >
                Confirmar alteração
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mechanicCardOpen} onOpenChange={setMechanicCardOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[85vh]">
          <div className="overflow-y-auto max-h-[85vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Wrench size={18} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground uppercase tracking-tight">Na Mecânica</h2>
                  <p className="text-[10px] text-muted-foreground">{grouped.in_repair.length} OS em andamento</p>
                </div>
              </div>
              <button onClick={() => setMechanicCardOpen(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {grouped.in_repair.length > 0 ? (
                grouped.in_repair.map((job) => (
                  <JobCard key={job.id} job={job} isLast={false} columnKey="in_repair" onAddRepair={handleAddRepair} onEdit={handleEditJob} onRetreat={handleRetreatJob} onAdvance={handleAdvanceJob} />
                ))
              ) : (
                <div className="py-10 text-center space-y-2 opacity-30">
                  <Wrench className="mx-auto" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma bike na mecânica</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Modal de Registro de Pagamento ─────────────────────────────────── */}
      <Dialog open={registerPayOpen} onOpenChange={setRegisterPayOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl p-0 overflow-hidden max-w-md shadow-2xl w-full">
          <div className="p-6 md:p-10 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight">Registrar Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'parcial', label: 'Parcial' },
                  { key: 'integral', label: 'Quitar' },
                  { key: 'desconto', label: 'Desconto' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setPayForm(f => ({ ...f, tipo: t.key as any }))}
                    className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${payForm.tipo === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {payForm.tipo === 'desconto' ? (
                <>
                  <InputGroup label="Valor do Desconto *">
                    <CurrencyInput value={payForm.desconto_valor} onChange={(val) => setPayForm(f => ({ ...f, desconto_valor: val }))} />
                  </InputGroup>
                  <InputGroup label="Motivo do Desconto *">
                    <PremiumInput placeholder="Ex: Cliente antigo, erro no prazo..." value={payForm.desconto_motivo} onChange={(e) => setPayForm(f => ({ ...f, desconto_motivo: e.target.value }))} />
                  </InputGroup>
                </>
              ) : (
                <>
                  <InputGroup label="Valor do Pagamento *">
                    <CurrencyInput value={payForm.valor} onChange={(val) => setPayForm(f => ({ ...f, valor: val }))} />
                  </InputGroup>
                  <InputGroup label="Forma de Pagamento *">
                    <div className="grid grid-cols-2 gap-2">
                      {["pix", "dinheiro", "cartao_debito", "cartao_credito"].map((m) => (
                        <button
                          key={m}
                          onClick={() => setPayForm(f => ({ ...f, method: m }))}
                          className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${payForm.method === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                        >
                          {m === 'pix' ? 'PIX' : m === 'dinheiro' ? 'Dinheiro' : m === 'cartao_debito' ? 'Débito' : 'Crédito'}
                        </button>
                      ))}
                    </div>
                  </InputGroup>
                </>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRegisterPayOpen(false)} className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all">Cancelar</button>
              <button onClick={submitPayment} disabled={registerPaymentMutation.isPending} className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all">
                {registerPaymentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Confirmar Recebimento"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Recibo ─────────────────────────────────────────────────── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl p-0 overflow-hidden max-w-md shadow-2xl w-full">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                <FileCheck size={24} className="text-primary" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Comprovante de Serviço</h2>
            </div>
            
            {receiptData && (
              <div className="space-y-4 text-xs font-bold uppercase tracking-wider">
                <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
                  <div className="flex justify-between pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="text-foreground">{receiptData.job.customer_name}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Bike</span>
                    <span className="text-foreground">{receiptData.job.bike_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data</span>
                    <span className="text-foreground">{new Date(receiptData.history.criado_em).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-4 bg-background rounded-2xl border border-border space-y-2">
                  <p className="text-[8px] text-muted-foreground mb-2">Resumo Financeiro</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Valor Total</span>
                    <span>{formatBRL(getTotalPrice(receiptData.job))}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Este Pagamento ({receiptData.history.payment_method || 'PIX'})</span>
                    <span>{formatBRL(receiptData.history.valor)}</span>
                  </div>
                  {receiptData.history.desconto_valor > 0 && (
                    <div className="flex justify-between text-purple-400">
                      <span>Desconto Concedido</span>
                      <span>{formatBRL(receiptData.history.desconto_valor)}</span>
                    </div>
                  )}
                  <div className="h-px bg-border/40 my-1" />
                  <div className="flex justify-between text-foreground">
                    <span>Saldo Restante</span>
                    <span>{formatBRL(Math.max(0, getTotalPrice(receiptData.job) - (receiptData.job.payment_history || []).filter(h => new Date(h.criado_em) <= new Date(receiptData.history.criado_em)).reduce((s, h) => s + Number(h.valor) + Number(h.desconto_valor), 0)))}</span>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                if (!receiptData) return;
                const msg = `📋 *Recibo de Serviço - Fefo Bikes*\n\n*Cliente:* ${receiptData.job.customer_name}\n*Bike:* ${receiptData.job.bike_name}\n*Data:* ${new Date(receiptData.history.criado_em).toLocaleDateString()}\n\n*Pagamento:* ${formatBRL(receiptData.history.valor)}\n*Forma:* ${receiptData.history.payment_method?.toUpperCase() || 'PIX'}\n*Total do Serviço:* ${formatBRL(getTotalPrice(receiptData.job))}\n\nObrigado pela preferência! 🚴✨`;
                sendMessage.mutate({
                  phone: receiptData.job.customer_whatsapp!,
                  message: msg
                }, { onSuccess: () => toast.success("Recibo enviado!") });
              }}
              className="w-full h-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-400 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
            >
              <Phone size={16} /> Enviar pelo WhatsApp
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Notificação Fullscreen de Aprovação ───────────────────────────── */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="border-none bg-background/95 backdrop-blur-2xl p-0 max-w-none w-screen h-screen m-0 rounded-none flex items-center justify-center animate-in fade-in zoom-in duration-500 outline-none">
          <div className="max-w-2xl w-full p-8 md:p-12 space-y-10 text-center relative">
            <div className={`w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center border-4 shadow-2xl animate-bounce ${notifData?.status === 'accepted' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20' : 'bg-destructive/20 border-destructive text-destructive shadow-destructive/20'}`}>
              {notifData?.status === 'accepted' ? <CheckCircle size={56} className="stroke-[2.5]" /> : <X size={56} className="stroke-[2.5]" />}
            </div>
            
            <div className="space-y-4">
              <h2 className={`text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none ${notifData?.status === 'accepted' ? 'text-emerald-400' : 'text-destructive'}`}>
                Serviço Extra {notifData?.status === 'accepted' ? 'Aprovado!' : 'Negado!'}
              </h2>
              <div className="space-y-2">
                <p className="text-xl md:text-2xl font-bold text-foreground uppercase tracking-widest">{notifData?.job?.customer_name || 'Cliente'}</p>
                <p className="text-lg text-muted-foreground font-medium italic">Bike: {notifData?.job?.bike_name || 'N/A'}</p>
              </div>
            </div>

            <div className="p-8 bg-card/50 border border-border/50 rounded-[3rem] space-y-3 relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity size={80} />
               </div>
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Resumo do Adicional</p>
               <p className="text-2xl font-bold text-foreground leading-tight italic">{notifData?.problem || 'Sem descrição'}</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-10">
              <button 
                onClick={() => setNotifOpen(false)}
                className="flex-1 h-20 rounded-[2rem] bg-card border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xl font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Ignorar
              </button>
              <button 
                onClick={() => {
                  if (!notifData?.job?.customer_whatsapp) return;
                  const phone = notifData.job.customer_whatsapp.replace(/\D/g, "");
                  window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}`, '_blank');
                  setNotifOpen(false);
                }}
                className="flex-[2] h-20 rounded-[2rem] bg-emerald-500 text-white hover:bg-emerald-400 text-xl font-black uppercase tracking-widest transition-all shadow-[0_0_50px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-4"
              >
                <Phone size={32} /> Ver no WhatsApp
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}
