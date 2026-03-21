import { useState, useMemo, useCallback, useEffect, Fragment, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import imageCompression from "browser-image-compression";
import { CustomerAutocomplete } from "@/components/CustomerAutocomplete";
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
  Camera,
  Image as ImageIcon,
  Eye,
  FileText,
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
  const parts = Array.isArray(a.parts_used) ? a.parts_used : [];
  const partsTotal = parts.reduce(
    (sum, p) => sum + (Number(p?.quantity) || 0) * (Number(p?.unit_price) || 0),
    0
  );
  return Number(a.labor_cost || 0) + partsTotal;
}

function getTotalPrice(job: MechanicJob | null) {
  if (!job) return 0;
  if (job.sem_custo) return 0;
  const base = Number(job.price || 0);
  const accepted = (Array.isArray(job.additions) ? job.additions : [])
    .filter((a) => {
      const status = (a?.approval as string);
      return status === "accepted" || status === "aprovado";
    })
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
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

function PremiumInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
    />
  );
}

function PremiumTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none ${className}`}
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
  const discount = Number((Array.isArray(job.payment_history) ? job.payment_history : []).reduce((s, h) => s + (Number(h?.desconto_valor) || 0), 0));
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

function AdditionBadge({ addition, showActions, isMechanicView }: { addition: MechanicJobAddition; showActions: boolean; isMechanicView?: boolean }) {
  const updateApproval = useUpdateAdditionApproval();
  const total = getAdditionTotal(addition);

  const handleApproval = (status: "accepted" | "refused") => {
    // For V2 (aprovado/recusado/pendente) or V1 (accepted/refused/pending)
    const isV2 = (addition as any).is_v2;
    const finalStatus = isV2 ? (status === "accepted" ? "aprovado" : "recusado") : status;
    updateApproval.mutate({ id: addition.id, approval: finalStatus as any, is_v2: isV2 });
  };

  const isAccepted = (addition.approval as string) === "accepted" || (addition.approval as string) === "aprovado";
  const isRefused = (addition.approval as string) === "refused" || (addition.approval as string) === "recusado" || (addition.approval as string) === "negado";

  const approvalColor =
    isAccepted ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
    : isRefused ? "border-destructive/30 bg-destructive/5 text-destructive"
    : "border-amber-500/30 bg-amber-500/5 text-amber-500";

  // In mechanic view, hide client-facing 'problem' if mechanic_notes exists
  const displayText = (isMechanicView && (addition as any).mechanic_notes) 
    ? (addition as any).mechanic_notes 
    : addition.problem;

  if (isMechanicView && !isAccepted) return null; // Don't show unapproved additions for mechanics

  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${approvalColor}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{displayText}</p>
        <p className="text-[10px] font-bold">{formatBRL(total)}</p>
      </div>
      {showActions && !isAccepted && !isRefused && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => handleApproval("refused")} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
            <X size={14} />
          </button>
          <button onClick={() => handleApproval("accepted")} className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-500/60 hover:text-emerald-500 transition-colors">
            <Check size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, isLast, columnKey, onAddRepair, onEdit, onRetreat, onAdvance, onFinalize, isMechanicView }: { job: MechanicJob; isLast: boolean; columnKey: string; onAddRepair: (j: MechanicJob) => void; onEdit: (j: MechanicJob) => void; onRetreat?: (j: MechanicJob) => void; onAdvance?: (j: MechanicJob) => void; onFinalize?: (j: MechanicJob) => void; isMechanicView?: boolean }) {
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
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden mb-3 hover:shadow-md transition-shadow">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-bold text-foreground truncate">{job.bike_name || "Sem Identificação"}</h3>
                <PaymentBadge job={job} />
              </div>
              <p className="text-xs text-muted-foreground">{job.customer_name || "Cliente Avulso"}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(job)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><Pencil size={14} /></button>
              <button onClick={() => setDeleteDialogOpen(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{job.problem}</p>
          
          {isMechanicView && job.additions && job.additions.length > 0 && (
            <div className="space-y-2 mt-2">
              {job.additions.map(a => {
                const notes = (a as any).mechanic_notes;
                const status = (a.approval as string);
                const approved = status === 'accepted' || status === 'aprovado';
                
                if (notes && approved) {
                  return (
                    <div key={a.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-2">Instrução Adicional</p>
                      <p className="text-xs font-medium text-foreground leading-relaxed">{notes}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {job.additions && job.additions.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {job.additions.map((a) => (
                <AdditionBadge 
                  key={a.id} 
                  addition={a} 
                  showActions={showApprovalActions} 
                  isMechanicView={isMechanicView} 
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</p>
            <p className="text-sm font-bold">{formatBRL(total)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onAddRepair(job)} className="p-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" title="Reparo Extra"><Plus size={16} /></button>
            {showRetreat && onRetreat && <button onClick={() => onRetreat(job)} className="h-9 px-3 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-bold text-xs uppercase hover:bg-amber-200 transition-colors">Voltar</button>}
            <button onClick={handleAdvance} disabled={advanceMutation.isPending} className={`h-9 px-4 rounded-md text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${isLast ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary hover:bg-primary/90"}`}>
              {advanceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : (isLast ? "Finalizar" : "Avançar")}
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
  const [showManualCustomer, setShowManualCustomer] = useState(false);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Ordem de Serviço
            </DialogTitle>
          </DialogHeader>

          {editJob && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Bike">
                  <PremiumInput value={editForm.bike_name} onChange={(e) => setEditForm((f: any) => ({ ...f, bike_name: e.target.value }))} />
                </InputGroup>
                <InputGroup label="Cliente">
                  <CustomerAutocomplete
                    customerName={editForm.customer_name}
                    customerWhatsapp={editForm.customer_whatsapp}
                    customerCpf={editForm.customer_cpf}
                    onSelect={(c: Customer) => {
                      setEditForm((f: any) => ({ ...f, customer_name: c.name, customer_whatsapp: c.whatsapp || "", customer_cpf: c.cpf || "", customer_id: c.id }));
                      setShowManualCustomer(false);
                    }}
                    onChange={(field, value) => {
                      const key = field === "name" ? "customer_name" : field === "whatsapp" ? "customer_whatsapp" : "customer_cpf";
                      setEditForm((f: any) => ({ ...f, [key]: value }));
                    }}
                  />
                </InputGroup>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setShowManualCustomer(!showManualCustomer)}
                  className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${showManualCustomer ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                    {showManualCustomer && <Check size={10} />}
                  </div>
                  Editar dados manuais
                </button>
              </div>

              {showManualCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border">
                  <InputGroup label="Nome">
                    <PremiumInput value={editForm.customer_name} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_name: e.target.value }))} />
                  </InputGroup>
                  <InputGroup label="WhatsApp">
                    <PremiumInput value={editForm.customer_whatsapp} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_whatsapp: maskPhone(e.target.value) }))} />
                  </InputGroup>
                  <InputGroup label="CPF">
                    <PremiumInput value={editForm.customer_cpf} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_cpf: maskCpfCnpj(e.target.value) }))} />
                  </InputGroup>
                </div>
              )}

              <InputGroup label="O que fazer?">
                <PremiumTextarea rows={3} value={editForm.problem} onChange={(e) => setEditForm((f: any) => ({ ...f, problem: e.target.value }))} />
              </InputGroup>

              <InputGroup label="Status do Fluxo">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { key: "in_approval", label: "Aprovação", icon: FileCheck },
                    { key: "in_maintenance", label: "Manutenção", icon: Wrench },
                    { key: "in_analysis", label: "Análise", icon: Eye },
                    { key: "ready", label: "Pronto", icon: CheckCircle2 },
                  ].map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => setEditForm((f: any) => ({ ...f, status: col.key }))}
                      className={`h-9 rounded-md border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                        editForm.status === col.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <col.icon size={12} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </InputGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md border">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">Sem Custo</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Garantia / Cortesia</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm((f: any) => ({ ...f, sem_custo: !f.sem_custo }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${editForm.sem_custo ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${editForm.sem_custo ? "left-5.5" : "left-0.5"}`} />
                  </button>
                </div>

                {!editForm.sem_custo && (
                  <InputGroup label="Mão de Obra">
                    <CurrencyInput value={editForm.price} onChange={(val) => setEditForm((f: any) => ({ ...f, price: val }))} />
                  </InputGroup>
                )}
              </div>

              {!editForm.sem_custo && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pagamentos</h4>
                    <button onClick={() => onRegisterPayment(editJob)} className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm">
                      <Plus size={10} /> Novo
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {(editJob?.payment_history || []).length > 0 ? (
                      editJob.payment_history.map((h: any) => (
                        <div key={h.id} className="flex items-center justify-between p-2.5 bg-muted/10 rounded-md border flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                              {h.payment_method?.slice(0, 3).toUpperCase() || 'PX'}
                            </span>
                            <div>
                              <p className="text-xs font-bold">{h.tipo === 'desconto' ? formatBRL(h.desconto_valor) : formatBRL(h.valor)}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(h.criado_em).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button onClick={() => onShowReceipt(editJob!, h)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><FileText size={14} /></button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-center text-muted-foreground italic py-4 opacity-40">Nenhum pagamento</p>
                    )}
                  </div>
                  <div className="p-3 bg-muted/20 rounded-md border flex justify-between items-center text-xs font-bold">
                    <span className="text-muted-foreground uppercase text-[10px]">Restante</span>
                    <span className={getTotalPrice(editJob) - ((Array.isArray(editJob?.payment_history) ? editJob.payment_history : []).reduce((s, h) => s + (Number(h?.valor) || 0) + (Number(h?.desconto_valor) || 0), 0)) <= 0 ? "text-emerald-600" : "text-amber-600"}>
                      {formatBRL(Math.max(0, getTotalPrice(editJob) - ((Array.isArray(editJob?.payment_history) ? editJob.payment_history : []).reduce((s, h) => s + (Number(h?.valor) || 0) + (Number(h?.desconto_valor) || 0), 0))))}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <OSPhotosSection osId={editJob?.id || ""} />
              </div>

              <div className="space-y-3 pt-6 border-t pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reparos Extras</h4>
                <div className="space-y-3">
                  {(!Array.isArray(editJob?.additions) || editJob.additions.length === 0) ? (
                    <div className="py-8 text-center bg-muted/10 border border-dashed rounded-md opacity-40">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sem reparos extras</p>
                    </div>
                  ) : (
                    editJob.additions.map((a: any) => {
                      const isEditing = editingAddition === a.id;
                      const edits = additionEdits[a.id];
                      return (
                        <div key={a.id} className="bg-muted/5 border rounded-lg p-4 space-y-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <InputGroup label="Problema">
                                <PremiumInput value={edits.problem} onChange={(e) => setAdditionEdits(p => ({ ...p, [a.id]: { ...edits, problem: e.target.value } }))} />
                              </InputGroup>
                              <div className="flex gap-2">
                                <div className="flex-1"><CurrencyInput value={edits.labor_cost} onChange={(val) => setAdditionEdits(p => ({ ...p, [a.id]: { ...edits, labor_cost: val } }))} /></div>
                                <button onClick={() => saveAddition(a)} className="px-4 bg-emerald-500 text-white rounded-md text-[10px] font-bold uppercase hover:bg-emerald-600">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-foreground truncate uppercase">{a.problem}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-primary">{formatBRL(getAdditionTotal(a))}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                      {a.approval === 'accepted' ? 'Aprovado' : a.approval === 'refused' ? 'Negado' : 'Pendente'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => startEditAddition(a)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-all"><Pencil size={12} /></button>
                                  <button onClick={() => setDeleteAdditionDialog({ open: true, id: a.id, name: a.problem, is_v2: (a as any).is_v2 })} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 size={12} /></button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {['none', 'pending', 'accepted', 'refused'].map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => updateApproval.mutate({ id: a.id, approval: status as any, is_v2: (a as any).is_v2 })}
                                    className={`flex-1 h-7 rounded-md text-[9px] font-bold uppercase border transition-all ${
                                      (a.approval === status || (status === 'none' && !a.approval))
                                        ? status === 'accepted' ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" 
                                          : status === 'refused' ? "border-destructive bg-destructive/10 text-destructive"
                                          : "border-primary bg-primary/10 text-primary"
                                        : "border-input bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {status === 'none' ? '—' : status === 'pending' ? 'Pen' : status === 'accepted' ? 'Apr' : 'Neg'}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t mt-4 sticky bottom-0 bg-background py-2">
            <button onClick={() => onOpenChange(false)} className="flex-1 h-10 rounded-md border border-input text-muted-foreground hover:bg-muted text-sm font-bold transition-all">Cancelar</button>
            <button onClick={onSave} disabled={isSaving} className="flex-[2] h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Salvar Alterações"}
            </button>
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
    // Only update if we have a matching job and it's not already correct
    const job = jobs.find(j => j.id === order.id);
    if (job && job.status !== "in_analysis") {
      await updateDetails.mutateAsync({ id: order.id, status: "in_analysis" } as any);
      toast.success(`🔧 ${order.bike_name || "Bike"} pronta pra entrega! (Em Análise)`, { duration: 8000 });
    }
  }, [jobs, updateDetails]);

  const handleServiceOrderAccepted = useCallback(async (order: ServiceOrder) => {
    playAcceptSound();
    const job = jobs.find(j => j.id === order.id);
    if (job && job.status !== "in_maintenance") {
      await updateDetails.mutateAsync({ id: order.id, status: "in_maintenance" } as any);
      toast.info(`⚙️ ${order.bike_name || "OS"} aceita por ${order.mechanic_name || "mecânico"}`, { duration: 5000 });
    }
  }, [jobs, updateDetails]);

  useServiceOrdersRealtime({ onDone: handleServiceOrderDone, onAccepted: handleServiceOrderAccepted });

  const { data: customers = [] } = useCustomers();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [showManualCustomer, setShowManualCustomer] = useState(true);
  const [suggestionField, setSuggestionField] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_name: "",
    bike_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    problem: "",
    price: 0,
    initialStatus: "in_approval" as MechanicJob["status"],
    paymentType: "nenhum" as "integral" | "parcial" | "nenhum",
    paymentAmount: 0,
    paymentMethod: "pix",
    status: "in_approval" as MechanicJob["status"],
    sem_custo: false,
    // New fields
    cep: "",
    address: "",
    number: "",
    complement: "",
    bairro: "",
    city: "",
    state: "",
    arrivalPhoto: null as File | null,
    arrivalPhotoPreview: "" as string,
    // Service composition
    parts: [] as AdditionPart[],
    labor_cost: 0,
    other_cost: 0,
  });

  const compositionTotal = useMemo(() => {
    const partsTotal = form.parts.reduce((s, p) => s + (p.quantity * p.unit_price), 0);
    return partsTotal + Number(form.labor_cost || 0) + Number(form.other_cost || 0);
  }, [form.parts, form.labor_cost, form.other_cost]);

  // Sync compositionTotal to form.price when it changes ONLY IF we are in Step 2 or it was just calculated
  useEffect(() => {
    if (step === 2 && form.price !== compositionTotal) {
      setForm(f => ({ ...f, price: compositionTotal }));
    }
  }, [compositionTotal, step, form.price]);

  const filteredCustomers = useMemo(() => {
    const query = suggestionField === 'name' ? form.customer_name : 
                  suggestionField === 'whatsapp' ? form.customer_whatsapp : 
                  suggestionField === 'cpf' ? form.customer_cpf : "";
    
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const qNum = query.replace(/\D/g, "");

    return customers.filter(c => {
      if (suggestionField === 'name') return c.name.toLowerCase().includes(q);
      if (suggestionField === 'whatsapp') return c.whatsapp?.replace(/\D/g, "").includes(qNum);
      if (suggestionField === 'cpf') return c.cpf?.replace(/\D/g, "").includes(qNum);
      return false;
    }).slice(0, 5);
  }, [customers, form, suggestionField]);

  const selectSuggestedCustomer = (c: Customer) => {
    setForm(prev => ({
      ...prev,
      customer_name: c.name,
      customer_whatsapp: maskPhone(c.whatsapp || ""),
      customer_cpf: maskCpfCnpj(c.cpf || ""),
      customer_id: c.id,
      address: (c as any).address_street || "",
      number: (c as any).address_number || "",
      complement: (c as any).address_complement || "",
      bairro: (c as any).address_neighborhood || "",
      city: (c as any).address_city || "",
      state: (c as any).address_state || "",
    }));
    setSuggestionField(null);
  };

  const [mechanicCardOpen, setMechanicCardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addJob, setAddJob] = useState<MechanicJob | null>(null);
  const [addForm, setAddForm] = useState({ problem: "", mechanic_notes: "", labor_cost: 0, parts: [] as AdditionPart[] });

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState<{ job: any, status: string, problem: string } | null>(null);

  // Realtime listener for extra services
  useEffect(() => {
    const channel = supabase
      .channel('os_adicionais_status_changes')
      .on('postgres_changes' as any, 
        { event: 'UPDATE', schema: 'public', table: 'os_adicionais' },
        async (payload: any) => {
          const isV2Approval = (payload.new.status === 'aprovado' || payload.new.status === 'recusado' || payload.new.status === 'negado') && 
                               (payload.old.status === 'pendente' || payload.old.status === 'enviado');
          const isV1Approval = (payload.new.status === 'accepted' || payload.new.status === 'refused') && 
                               (payload.old.status === 'pending');

          if (isV2Approval || isV1Approval) {
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

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

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
    const alreadyCleared = (Array.isArray(editJob.payment_history) ? editJob.payment_history : []).reduce((s, h) => s + (Number(h.valor) || 0) + (Number(h.desconto_valor) || 0), 0);
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

  const uploadPhoto = useUploadPhoto();

  const handleSave = () => {
    if (!form.problem.trim()) { toast.error("Descreva o problema"); return; }
    
    // Validate required fields for Step 1
    if (!form.customer_name || !form.customer_whatsapp || !form.customer_cpf || !form.bike_name) {
      toast.error("Nome, WhatsApp, CPF e Bike são obrigatórios!");
      return;
    }
    const phoneDigits = form.customer_whatsapp.replace(/\D/g, "");
    if (form.customer_whatsapp && phoneDigits.length < 10) {
      toast.error("WhatsApp inválido — digite o número completo com DDD");
      return;
    }

    const orderData = {
      customer_name: form.customer_name || null,
      customer_cpf: form.customer_cpf || null,
      customer_whatsapp: form.customer_whatsapp || null,
      customer_id: form.customer_id || null,
      bike_name: form.bike_name || null,
      problem: form.problem || "",
      price: form.sem_custo ? 0 : (Number(form.price) || 0),
      status: form.initialStatus || "in_approval",
      sem_custo: !!form.sem_custo,
    };

    const paymentData = (!form.sem_custo && form.paymentType !== 'nenhum') ? {
      tipo: form.paymentType,
      valor_pago: form.paymentType === 'integral' ? (Number(form.price) || 0) : (Number(form.paymentAmount) || 0),
      method: form.paymentMethod || 'pix'
    } : undefined;

    create.mutate({ ...orderData, payment: paymentData } as any, {
      onSuccess: async (newJob) => {
        const partsTotal = form.parts.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.unit_price || 0)), 0);
        
        // Save composition parts if any
        if (form.parts && form.parts.length > 0) {
          try {
            await createAddition.mutateAsync({
              job_id: newJob.id,
              problem: "Peças iniciais da O.S.",
              price: partsTotal,
              labor_cost: 0, // Labor already went to base price as per user request
              parts_used: form.parts,
            } as any);
            // After saving addition, we technically should subtract partsTotal from base price
            // to keep the grand total consistent with (base + additions).
            // But the user said labor and others go to price, and Total goes to price.
            // So we'll update the OS price to be (Total - partsTotal) to avoid doubling.
            await updateDetails.mutateAsync({ id: newJob.id, price: Number(form.price) - partsTotal } as any);
          } catch (err) {
             console.error("Erro ao salvar peças da composição:", err);
          }
        }

        // Handle Photo Upload if present
        if (form.arrivalPhoto) {
          try {
            await uploadPhoto.mutateAsync({ 
              osId: newJob.id, 
              file: form.arrivalPhoto, 
              tipo: "chegada" 
            });
          } catch (err) {
            console.error("Erro ao subir foto de chegada:", err);
          }
        }


        if (form.initialStatus === "in_repair") {
          createServiceOrder.mutate({ 
            id: newJob.id, 
            customer_name: form.customer_name || undefined, 
            customer_cpf: form.customer_cpf || undefined, 
            customer_whatsapp: form.customer_whatsapp || undefined, 
            customer_id: form.customer_id || undefined, 
            bike_name: form.bike_name || undefined, 
            problem: form.problem 
          });
        }

        if (form.customer_whatsapp) {
          const phone = form.customer_whatsapp.replace(/\D/g, "");
          const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
          
          console.log("WhatsApp no handleSave:", form.customer_whatsapp);
          console.log("Formatted Phone result:", formattedPhone);

          sendMessage.mutate({ 
            phone: formattedPhone, 
            message: `Olá, ${form.customer_name || "cliente"}! Sua bicicleta ${form.bike_name ? `(${form.bike_name}) ` : ""}já está na mecânica. Quando algum mecânico começar o serviço, te avisaremos por aqui.` 
          });
        }

        toast.success("Manutenção criada!");
        setForm({ 
          customer_name: "", bike_name: "", customer_cpf: "", customer_whatsapp: "", customer_id: null, 
          problem: "", price: 0, initialStatus: "in_approval", paymentType: "nenhum", 
          paymentAmount: 0, paymentMethod: "pix", status: "in_approval", sem_custo: false,
          cep: "", address: "", number: "", complement: "", bairro: "", city: "", state: "",
          arrivalPhoto: null, arrivalPhotoPreview: "",
          parts: [], labor_cost: 0, other_cost: 0
        } as any);
        setOpen(false);
        setStep(1);
      },
      onError: (err: any) => {
        console.error("Erro ao criar OS:", err);
        toast.error("Erro ao criar: " + (err.message || "Valor inválido enviado"));
      },
    });
  };

  const handleSearchCEP = async (cep: string) => {
    const rawCep = cep.replace(/\D/g, "");
    if (rawCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            address: data.logradouro,
            bairro: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        initialQuality: 0.7
      };
      try {
        const compressedFile = await imageCompression(file, options);
        const preview = URL.createObjectURL(compressedFile);
        setForm(prev => ({ ...prev, arrivalPhoto: compressedFile as File, arrivalPhotoPreview: preview }));
      } catch (err) {
        console.error("Erro ao comprimir imagem:", err);
        toast.error("Erro ao processar imagem");
      }
    }
  };

  const handleAddRepair = (job: MechanicJob) => { setAddJob(job); setAddForm({ problem: "", mechanic_notes: "", labor_cost: 0, parts: [] }); setAddOpen(true); };
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
    
    const phoneDigits = editForm.customer_whatsapp.replace(/\D/g, "");
    if (editForm.customer_whatsapp && phoneDigits.length < 10) {
      toast.error("WhatsApp inválido — digite o número completo com DDD");
      return;
    }

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
        mechanic_notes: addForm.mechanic_notes,
        price: totalCost,
        valor_total: totalCost, // For consistency between old and new columns
        labor_cost: addForm.labor_cost,
        parts_used: addForm.parts,
        status: "pendente" // Initial status as per requirements for approval flow
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Oficina
            </h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gerenciamento de Manutenções</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Ticket Médio</p>
              <p className="text-lg font-bold">{formatBRL(avgTicket)}</p>
            </div>
            <button onClick={() => setOpen(true)} className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm active:scale-95">
              <Plus size={18} /> Nova O.S
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
                <button key={tab.key} onClick={() => setMobileTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-bold transition-all whitespace-nowrap ${mobileTab === tab.key ? `${tab.bg} ${tab.color} ${tab.border} shadow-sm` : "bg-card text-muted-foreground border-border"}`}>
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
                <button onClick={() => setMechanicCardOpen(true)} className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-4 py-2 flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors">
                  <Wrench size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-600">Na Mecânica ({grouped.in_repair.length})</span>
                </button>
              </div>
            )}

            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
              {columns.map((col) => (
                <div key={col.key} className="flex-1 min-w-0 flex flex-col bg-muted/20 rounded-lg p-3 border">
                  <ColumnHeader {...col} count={grouped[col.key].length} />
                  <div className="space-y-3 pb-6 flex-1">
                    {grouped[col.key].length > 0 ? (
                      grouped[col.key].map((job) => (
                        <JobCard key={job.id} job={job} isLast={col.key === "ready"} columnKey={col.key} onAddRepair={handleAddRepair} onEdit={handleEditJob} onRetreat={handleRetreatJob} onAdvance={col.key !== "ready" ? handleAdvanceJob : undefined} onFinalize={col.key === "ready" ? handleOpenFinalize : undefined} />
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
                        <Layers size={32} />
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-3">Vazio</p>
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

      <Dialog open={open} onOpenChange={(v) => { 
        setOpen(v); 
        if (!v) {
          setStep(1);
          setShowManualCustomer(false);
          setForm({ 
            customer_name: "", bike_name: "", customer_cpf: "", customer_whatsapp: "", customer_id: null, 
            problem: "", price: 0, initialStatus: "in_approval", paymentType: "nenhum", 
            paymentAmount: 0, paymentMethod: "pix", status: "in_approval", sem_custo: false,
            cep: "", address: "", number: "", complement: "", bairro: "", city: "", state: "",
            arrivalPhoto: null, arrivalPhotoPreview: "",
            parts: [], labor_cost: 0, other_cost: 0
          } as any);
        }
      }}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-background border-none shadow-2xl">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Nova Ordem de Serviço
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Criação de Atendimento</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between px-2">
              {[1, 2, 3, 4].map((s, idx) => (
                <Fragment key={s}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${step >= s ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground"}`}>
                      {s}
                    </div>
                  </div>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-700 ${step > s ? "bg-primary" : "bg-muted"}`} />
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <InputGroup label="Nome Completo *">
                        <div className="relative">
                          <PremiumInput 
                            value={form.customer_name} 
                            onChange={(e) => {
                              setForm(f => ({ ...f, customer_name: e.target.value, customer_id: null }));
                              setSuggestionField('name');
                            }} 
                            onBlur={() => setTimeout(() => setSuggestionField(null), 200)}
                            placeholder="Nome Completo" 
                          />
                          {suggestionField === 'name' && filteredCustomers.length > 0 && (
                            <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                              {filteredCustomers.map(c => (
                                <button key={c.id} onClick={() => selectSuggestedCustomer(c)} className="w-full px-4 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0 transition-colors">
                                  <p className="text-xs font-bold text-white leading-none">{c.name}</p>
                                  <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest">{c.whatsapp || "Sem whats"} · {c.cpf || "Sem CPF"}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </InputGroup>
                    </div>

                    <InputGroup label="WhatsApp *">
                      <div className="relative">
                        <PremiumInput 
                          value={form.customer_whatsapp} 
                          onChange={(e) => {
                            setForm(f => ({ ...f, customer_whatsapp: maskPhone(e.target.value), customer_id: null }));
                            setSuggestionField('whatsapp');
                          }} 
                          onBlur={() => setTimeout(() => setSuggestionField(null), 200)}
                          placeholder="(00) 00000-0000" 
                        />
                        {suggestionField === 'whatsapp' && filteredCustomers.length > 0 && (
                          <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                            {filteredCustomers.map(c => (
                              <button key={c.id} onClick={() => selectSuggestedCustomer(c)} className="w-full px-4 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0 transition-colors">
                                <p className="text-xs font-bold text-white font-black">{c.whatsapp}</p>
                                <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest">{c.name}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </InputGroup>

                    <InputGroup label="CPF *">
                      <div className="relative">
                        <PremiumInput 
                          value={form.customer_cpf} 
                          onChange={(e) => {
                            setForm(f => ({ ...f, customer_cpf: maskCpfCnpj(e.target.value), customer_id: null }));
                            setSuggestionField('cpf');
                          }} 
                          onBlur={() => setTimeout(() => setSuggestionField(null), 200)}
                          placeholder="000.000.000-00" 
                        />
                        {suggestionField === 'cpf' && filteredCustomers.length > 0 && (
                          <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                            {filteredCustomers.map(c => (
                              <button key={c.id} onClick={() => selectSuggestedCustomer(c)} className="w-full px-4 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0 transition-colors">
                                <p className="text-xs font-bold text-white">{c.cpf}</p>
                                <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest">{c.name}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </InputGroup>

                    <div className="col-span-1 md:col-span-2 grid grid-cols-4 gap-3 bg-muted/20 p-4 rounded-2xl border border-border/40">
                      <div className="col-span-1">
                        <InputGroup label="CEP">
                          <PremiumInput 
                            value={form.cep} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                              setForm(f => ({ ...f, cep: val }));
                              if (val.length === 8) handleSearchCEP(val);
                            }} 
                            placeholder="00000-000" 
                          />
                        </InputGroup>
                      </div>
                      <div className="col-span-3">
                        <InputGroup label="Endereço">
                          <PremiumInput value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua / Avenida" />
                        </InputGroup>
                      </div>
                      <div className="col-span-1">
                        <InputGroup label="Nº">
                          <PremiumInput value={form.number} onChange={(e) => setForm(f => ({ ...f, number: e.target.value }))} placeholder="Nº" />
                        </InputGroup>
                      </div>
                      <div className="col-span-3">
                        <InputGroup label="Bairro">
                          <PremiumInput value={form.bairro} onChange={(e) => setForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
                        </InputGroup>
                      </div>
                      <div className="col-span-3">
                        <InputGroup label="Cidade">
                          <PremiumInput value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
                        </InputGroup>
                      </div>
                      <div className="col-span-1">
                        <InputGroup label="UF">
                          <PremiumInput value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} maxLength={2} placeholder="UF" />
                        </InputGroup>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                       <InputGroup label="Bike / Marca / Modelo *">
                        <div className="relative">
                          <PremiumInput value={form.bike_name} onChange={(e) => setForm(f => ({ ...f, bike_name: e.target.value }))} placeholder="Ex: Specialized Epic, Caloi Carbon..." />
                          <Bike className="absolute right-3 top-2.5 text-muted-foreground/30" size={18} />
                        </div>
                      </InputGroup>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <InputGroup label="Foto de Chegada (Opcional)">
                        <div className="flex flex-col gap-3 mt-1">
                          <div className="flex gap-2">
                            <label className="flex-1 h-12 bg-muted/40 border border-border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/60 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground group">
                              <Camera size={14} className="group-hover:text-primary transition-colors" /> Tirar Foto
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                            </label>
                            <label className="flex-1 h-12 bg-muted/40 border border-border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/60 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground group">
                              <ImageIcon size={14} className="group-hover:text-primary transition-colors" /> Galeria
                              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                            </label>
                          </div>
                          {form.arrivalPhotoPreview && (
                            <div className="relative w-24 h-24 rounded-2xl border-2 border-primary/20 overflow-hidden group shadow-xl ring-4 ring-primary/5">
                              <img src={form.arrivalPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                              <button onClick={() => setForm(f => ({ ...f, arrivalPhoto: null, arrivalPhotoPreview: "" }))} className="absolute inset-0 bg-destructive/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Trash2 size={24} />
                              </button>
                            </div>
                          )}
                        </div>
                      </InputGroup>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <InputGroup label="Diagnóstico / O que fazer? *">
                    <PremiumTextarea 
                      rows={4} 
                      placeholder="Descreva detalhadamente o problema relatado pelo cliente ou os serviços que devem ser executados..." 
                      value={form.problem} 
                      onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))} 
                    />
                  </InputGroup>

                  {/* ── Composição do Serviço ────────────────────────────────── */}
                  <div className="space-y-6 pt-4 border-t border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Composição do Serviço</h4>
                    </div>

                    <div className="space-y-4">
                      <InputGroup label="1. Peças do Sistema (Opcional)">
                        <AddRepairPartSelector 
                          selectedParts={form.parts} 
                          onChange={(parts) => setForm(f => ({ ...f, parts }))} 
                        />
                      </InputGroup>

                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="2. Mão de obra">
                          <CurrencyInput 
                            value={form.labor_cost} 
                            onChange={(val) => setForm(f => ({ ...f, labor_cost: val }))} 
                            className="h-12"
                          />
                        </InputGroup>
                        <InputGroup label="3. Outros / Materiais">
                          <CurrencyInput 
                            value={form.other_cost} 
                            onChange={(val) => setForm(f => ({ ...f, other_cost: val }))} 
                            className="h-12"
                          />
                        </InputGroup>
                      </div>

                      {/* ── Subtotal Card ─────────────────────────────────────── */}
                      <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                           <TrendingUp size={64} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Peças</span>
                          <span>{formatBRL(form.parts.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.unit_price || 0)), 0))}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
                          <span>Mão de obra / Outros</span>
                          <span>{formatBRL(Number(form.labor_cost || 0) + Number(form.other_cost || 0))}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Total Estimado</span>
                          <span className="text-xl font-black text-white">{formatBRL(compositionTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <InputGroup label="Coluna Inicial no Kanban">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "in_approval", label: "Orçamento", icon: FileCheck },
                        { key: "in_repair", label: "Na Mecânica", icon: Wrench },
                        { key: "in_maintenance", label: "Em Manutenção", icon: Settings },
                        { key: "in_analysis", label: "Em Análise", icon: Activity },
                        { key: "ready", label: "Pronto", icon: CheckCircle2 }
                      ].map((s, idx, arr) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, initialStatus: s.key as any }))}
                          className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                            form.initialStatus === s.key ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20" : "border-border hover:bg-muted/50"
                          } ${idx === arr.length - 1 && arr.length % 2 !== 0 ? "col-span-2 justify-center max-w-[240px] mx-auto w-full" : ""}`}
                        >
                          <div className={`p-2.5 rounded-xl transition-colors ${form.initialStatus === s.key ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"}`}>
                            <s.icon size={18} />
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-widest ${form.initialStatus === s.key ? "text-primary" : "text-muted-foreground"}`}>
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </InputGroup>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-3xl">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-primary leading-none">Tipo de Cobrança</p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 opacity-60">Garantia ou Cortesia da Loja?</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setForm(f => ({ ...f, sem_custo: !f.sem_custo }))} 
                      className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${form.sem_custo ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <motion.div 
                        animate={{ x: form.sem_custo ? 30 : 4 }}
                        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
                      >
                        {form.sem_custo && <Check size={10} className="text-emerald-600" />}
                      </motion.div>
                    </button>
                  </div>

                  {!form.sem_custo ? (
                    <motion.div 
                      key="valor-inputs"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      <InputGroup label="Valor Previsto da Manutenção *">
                        <div className="relative group">
                          <CurrencyInput value={form.price} onChange={(val) => setForm((f: any) => ({ ...f, price: val }))} className="h-14 text-lg font-black" />
                          <TrendingUp className="absolute right-4 top-4 text-primary/30 group-focus-within:text-primary transition-colors" size={20} />
                        </div>
                      </InputGroup>

                      <div className="space-y-4">
                        <InputGroup label="Adiantamento">
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'nenhum', label: 'Nenhum' },
                              { key: 'parcial', label: 'Parcial' },
                              { key: 'integral', label: 'Integral' }
                            ].map((type) => (
                              <button 
                                key={type.key} 
                                type="button" 
                                onClick={() => setForm((f: any) => ({ ...f, paymentType: type.key as any }))} 
                                className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.paymentType === type.key ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105" : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/80"}`}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </InputGroup>

                        {form.paymentType !== 'nenhum' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            className="space-y-5 p-5 bg-muted/20 rounded-3xl border border-border/60 backdrop-blur-sm"
                          >
                            {form.paymentType === 'parcial' && (
                              <InputGroup label="Quanto o cliente pagou?">
                                <CurrencyInput value={form.paymentAmount} onChange={(val) => setForm((f: any) => ({ ...f, paymentAmount: val }))} />
                              </InputGroup>
                            )}
                            <InputGroup label="Forma de Pagamento Utilizada">
                              <div className="grid grid-cols-2 gap-2">
                                {['PIX', 'Dinheiro', 'Débito', 'Crédito'].map((method) => (
                                  <button
                                    key={method}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, paymentMethod: method.toLowerCase() }))}
                                    className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${form.paymentMethod === method.toLowerCase() ? "border-primary bg-primary/15 text-primary shadow-sm" : "border-border/60 bg-background text-muted-foreground"}`}
                                  >
                                    {method}
                                  </button>
                                ))}
                              </div>
                            </InputGroup>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="sem-custo-msg"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-14 flex flex-col items-center justify-center bg-emerald-500/5 rounded-3xl border border-dashed border-emerald-500/30 text-emerald-600/60"
                    >
                      <Tag size={40} className="mb-4 text-emerald-500" />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]">Cortesia / Garantia</p>
                      <p className="text-[9px] font-medium uppercase mt-2 opacity-70">Nenhuma cobrança será gerada</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="bg-muted/10 border border-border/80 rounded-[32px] overflow-hidden shadow-2xl shadow-primary/5">
                    <div className="bg-primary/5 px-8 py-5 border-b border-primary/10 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary leading-none">Resumo da O.S</h3>
                        <p className="text-[9px] text-muted-foreground font-bold mt-1.5 uppercase tracking-widest opacity-60">Confirmação do Atendimento</p>
                      </div>
                      {form.sem_custo && (
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm">
                          Sem Custo
                        </div>
                      )}
                    </div>
                    
                    <div className="p-8 space-y-6">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-5">
                          <div className="space-y-1.5">
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em]">Proprietário</p>
                            <p className="text-sm font-black text-white">{form.customer_name || "—"}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                               <span className="text-[10px] font-bold text-muted-foreground/80 bg-muted/40 px-2 py-0.5 rounded-lg">{form.customer_whatsapp}</span>
                               <span className="text-[10px] font-bold text-muted-foreground/80 bg-muted/40 px-2 py-0.5 rounded-lg">{form.customer_cpf}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em]">Equipamento</p>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                <Bike size={14} />
                              </div>
                              <p className="text-sm font-black text-white">{form.bike_name || "—"}</p>
                            </div>
                          </div>
                        </div>

                        {form.arrivalPhotoPreview && (
                          <div className="w-28 h-28 rounded-3xl border border-primary/10 p-1 bg-muted/20 shrink-0">
                            <img src={form.arrivalPhotoPreview} className="w-full h-full object-cover rounded-2xl shadow-lg" alt="Arrival preview" />
                          </div>
                        )}
                      </div>

                      <div className="p-5 bg-muted/30 rounded-3xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                           <FileText size={40} />
                        </div>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-3">Diagnóstico Detalhado</p>
                        <p className="text-[13px] text-white/90 font-medium leading-relaxed line-clamp-4 italic">"{form.problem || "—"}"</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 group hover:border-primary/30 transition-colors">
                          <p className="text-[9px] text-primary font-black uppercase tracking-widest mb-1.5">Localização Inicial</p>
                          <div className="flex items-center gap-2">
                             <Activity size={12} className="text-primary animate-pulse" />
                             <p className="text-[11px] font-bold text-white uppercase tracking-tight">{columns.find(c => c.key === form.initialStatus)?.label}</p>
                          </div>
                        </div>
                        <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 group hover:border-primary/30 transition-colors">
                          <p className="text-[9px] text-primary font-black uppercase tracking-widest mb-1.5">Orçamento Previsto</p>
                          <div className="flex items-center gap-2">
                             <TrendingUp size={12} className="text-primary" />
                             <p className="text-sm font-black text-white">{form.sem_custo ? "CORTESIA" : formatBRL(form.price)}</p>
                          </div>
                        </div>
                      </div>

                      {!form.sem_custo && form.paymentType !== 'nenhum' && (
                        <div className="p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex justify-between items-center shadow-emerald-500/5 shadow-inner">
                          <div>
                            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                               <CheckCircle size={10} /> Adiantamento ({form.paymentType})
                            </p>
                            <p className="text-lg font-black text-emerald-600 tracking-tight">{formatBRL(form.paymentType === 'integral' ? form.price : form.paymentAmount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1.5">Meio Usado</p>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/20">{form.paymentMethod}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 px-6 py-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                      <AlertTriangle size={18} className="text-amber-600" />
                    </div>
                    <p className="text-[11px] font-medium text-amber-700/80 leading-relaxed">
                      Ao abrir este atendimento, um aviso será enviado automaticamente para o WhatsApp do cliente. Certifique-se de que os dados estão corretos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="p-6 md:p-8 pt-0 border-t border-border/40 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)} 
                className="h-12 px-6 rounded-2xl border border-border text-muted-foreground hover:bg-muted font-bold text-[11px] uppercase tracking-[0.1em] flex items-center gap-2 transition-all active:scale-95 shrink-0"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
            ) : (
              <button 
                onClick={() => { setOpen(false); setStep(1); }} 
                className="h-12 px-6 rounded-2xl text-muted-foreground hover:text-white font-bold text-[11px] uppercase tracking-[0.1em] transition-colors"
              >
                Cancelar
              </button>
            )}
            
            <div className="flex gap-3 ml-auto w-full md:w-auto">
              {step < 4 ? (
                <button 
                  onClick={() => {
                    if (step === 1 && (!form.customer_name || !form.customer_whatsapp || !form.customer_cpf || !form.bike_name)) {
                      toast.error("Nome, WhatsApp, CPF e Bike são obrigatórios!");
                      return;
                    }
                    if (step === 2 && !form.problem.trim()) {
                      toast.error("Descreva o diagnóstico primeiro!");
                      return;
                    }
                    if (step === 3 && !form.sem_custo && Number(form.price) <= 0) {
                        toast.error("Especifique o valor previsto");
                        return;
                    }
                    setStep(step + 1);
                  }}
                  className="w-full md:w-auto h-12 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/90 shadow-2xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                >
                  Continuar <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  onClick={handleSave}
                  disabled={create.isPending}
                  className="w-full md:w-auto h-12 px-12 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {create.isPending ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <FileCheck size={18} className="animate-bounce" /> Abrir Atendimento
                    </>
                  )}
                </button>
              )}
            </div>
          </DialogFooter>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="1. Para o cliente (Visível na aprovação)">
                    <PremiumTextarea rows={3} placeholder="Descrição curta para o WhatsApp: problemas e peças..." value={addForm.problem} onChange={(e) => setAddForm((f) => ({ ...f, problem: e.target.value }))} />
                  </InputGroup>
                  <InputGroup label="2. Instruções para o mecânico (Interno)">
                    <PremiumTextarea rows={3} placeholder="Instruções técnicas, detalhes internos ou segredos do serviço..." value={addForm.mechanic_notes} onChange={(e) => setAddForm((f) => ({ ...f, mechanic_notes: e.target.value }))} />
                  </InputGroup>
                </div>
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

      <>
        {mechanicCardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMechanicCardOpen(false)} />
            <div className="relative bg-secondary border border-border rounded-2xl p-0 overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
              <div style={{display:'none'}}>
                <DialogTitle>Ordens na Mecânica</DialogTitle>
              </div>

              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Wrench size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground uppercase tracking-tight">Na Mecânica</h2>
                    <p className="text-[10px] text-muted-foreground font-bold">{(grouped.in_repair || []).length} OS em andamento</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMechanicCardOpen(false)} 
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {(Array.isArray(grouped.in_repair) && grouped.in_repair.length > 0) ? (
                  grouped.in_repair.map((job) => {
                    if (!job) return null;
                    return (
                      <JobCard 
                        key={job.id} 
                        job={job} 
                        isLast={false} 
                        columnKey="in_repair" 
                        onAddRepair={handleAddRepair} 
                        onEdit={handleEditJob} 
                        onRetreat={handleRetreatJob} 
                        onAdvance={handleAdvanceJob} 
                        isMechanicView={true} 
                      />
                    );
                  })
                ) : (
                  <div className="py-20 text-center space-y-3 opacity-20">
                    <Wrench className="mx-auto" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma bike na mecânica</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
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
                    <span>{formatBRL(Math.max(0, getTotalPrice(receiptData.job) - (Array.isArray(receiptData.job.payment_history) ? receiptData.job.payment_history : []).filter(h => new Date(h.criado_em) <= new Date(receiptData.history.criado_em)).reduce((s, h) => s + Number(h.valor) + Number(h.desconto_valor), 0)))}</span>
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
      {notifOpen && <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="border-none bg-background p-0 max-w-none w-screen h-screen m-0 rounded-none flex items-center justify-center animate-in fade-in zoom-in duration-500 outline-none">
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
      </Dialog>}
    </div>
  );
}
