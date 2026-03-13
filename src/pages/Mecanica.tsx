import { useState, useMemo, useCallback } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { CustomerAutocomplete } from "@/components/CustomerAutocomplete";
import type { Customer } from "@/hooks/useCustomers";
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
  Pencil,
  FileCheck,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useMechanicJobs,
  useCreateMechanicJob,
  useAdvanceMechanicJob,
  useDeleteMechanicJob,
  useCreateAddition,
  useUpdateAdditionApproval,
  useRetreatMechanicJob,
  useUpdateMechanicJobDetails,
  useUpdateAddition,
  useDeleteAddition,
  type MechanicJob,
  type MechanicJobAddition,
  type AdditionPart,
} from "@/hooks/useMechanicJobs";
import { useParts } from "@/hooks/useParts";
import { useServiceOrdersRealtime, useCreateServiceOrder, type ServiceOrder } from "@/hooks/useServiceOrders";
import { playNotifySound, playAcceptSound } from "@/lib/sounds";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { formatBRL } from "@/lib/format";

function getAdditionTotal(a: MechanicJobAddition) {
  const partsTotal = (a.parts_used || []).reduce(
    (sum, p) => sum + p.quantity * p.unit_price,
    0
  );
  return Number(a.labor_cost || 0) + partsTotal;
}

function getTotalPrice(job: MechanicJob) {
  const base = Number(job.price);
  const accepted = (job.additions || [])
    .filter((a) => a.approval === "accepted")
    .reduce((sum, a) => sum + getAdditionTotal(a), 0);
  return base + accepted;
}

// ─── Column config (4 columns: Em Aprovação, Em Manutenção, Em Análise, Pronta) ──

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
    icon: Search,
    color: "text-orange-400",
    bg: "bg-orange-400/5",
    border: "border-orange-400/20",
  },
  {
    key: "ready" as const,
    label: "Pronta pra Retirada",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/5",
    border: "border-emerald-400/20",
  },
];

// ─── Sub-components (visual only) ─────────────────────────────────────────────

const SummaryStat = ({
  title,
  value,
  icon,
  color = "text-white",
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="bg-card border border-border p-4 md:p-6 rounded-2xl md:rounded-[32px] flex items-center gap-3 md:gap-4 hover:border-border/80 transition-all overflow-hidden">
    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-background flex items-center justify-center text-muted-foreground shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest truncate">{title}</p>
      <p className={`text-base md:text-xl font-black ${color} truncate`}>{value}</p>
    </div>
  </div>
);

const ColumnHeader = ({
  label,
  icon: Icon,
  count,
  color,
  bg,
  border,
}: {
  label: string;
  icon: React.ElementType;
  count: number;
  color: string;
  bg: string;
  border: string;
}) => (
  <div className={`flex items-center gap-2 p-3 rounded-2xl border ${border} ${bg} mb-4`}>
    <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center ${color} bg-white/5 shadow-inner shrink-0`}>
      <Icon size={16} className="stroke-[2.5]" />
    </div>
    <div className="min-w-0">
      <h3 className="text-[10px] lg:text-xs font-black text-white uppercase tracking-wider truncate">{label}</h3>
      <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase">{count} ativos</p>
    </div>
  </div>
);

const InputGroup = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
      {label}
    </label>
    {children}
  </div>
);

const PremiumInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className="w-full h-14 bg-card border border-border rounded-2xl px-5 text-sm font-semibold text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_1px_rgba(41,82,255,0.1)] transition-all placeholder:text-muted-foreground/70"
    {...props}
  />
);

const PremiumTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className="w-full bg-card border border-border rounded-[20px] p-5 text-sm text-foreground outline-none focus:border-primary transition-all resize-none placeholder:text-muted-foreground/70 leading-relaxed"
    {...props}
  />
);

// ─── Addition Badge ───────────────────────────────────────────────────────────

function AdditionBadge({
  addition,
  showActions,
}: {
  addition: MechanicJobAddition;
  showActions: boolean;
}) {
  const updateApproval = useUpdateAdditionApproval();

  const styles = {
    accepted: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    refused: "bg-red-500/5 border-red-500/20 text-red-400 opacity-60",
    pending: "bg-amber-500/5 border-amber-500/20 text-amber-400",
  };

  const icons = {
    accepted: <Check size={12} />,
    refused: <X size={12} />,
    pending: <Clock size={12} />,
  };

  const addTotal = getAdditionTotal(addition);

  return (
    <div
      className={`p-3 rounded-xl border ${styles[addition.approval]} transition-all ${addition.approval === "pending" ? "animate-pulse" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          {icons[addition.approval]}
          <span
            className={`text-[10px] font-bold truncate ${addition.approval === "refused" ? "line-through" : ""}`}
          >
            {addition.problem}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-[10px] font-black">{formatBRL(addTotal)}</span>
          {showActions && addition.approval === "pending" && (
            <div className="flex gap-1">
              <button
                className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center hover:bg-red-500 transition-colors"
                onClick={() =>
                  updateApproval.mutate(
                    { id: addition.id, approval: "refused" },
                    { onError: () => toast.error("Erro") }
                  )
                }
                disabled={updateApproval.isPending}
              >
                <X size={10} className="text-white" />
              </button>
              <button
                className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500 transition-colors"
                onClick={() =>
                  updateApproval.mutate(
                    { id: addition.id, approval: "accepted" },
                    { onError: () => toast.error("Erro") }
                  )
                }
                disabled={updateApproval.isPending}
              >
                <Check size={10} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Parts & labor breakdown */}
      {((addition.parts_used || []).length > 0 || Number(addition.labor_cost) > 0) && (
        <div className="mt-1.5 pl-5 space-y-0.5">
          {(addition.parts_used || []).map((p, i) => (
            <p key={i} className="text-[9px] text-muted-foreground">
              {p.quantity}x {p.part_name} — {formatBRL(p.quantity * p.unit_price)}
            </p>
          ))}
          {Number(addition.labor_cost) > 0 && (
            <p className="text-[9px] text-muted-foreground">
              Mão de obra — {formatBRL(Number(addition.labor_cost))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  isLast,
  columnKey,
  onAddRepair,
  onEdit,
  onRetreat,
  onAdvance,
}: {
  job: MechanicJob;
  isLast: boolean;
  columnKey: string;
  onAddRepair: (job: MechanicJob) => void;
  onEdit: (job: MechanicJob) => void;
  onRetreat?: (job: MechanicJob) => void;
  onAdvance?: (job: MechanicJob) => void;
}) {
  const advanceMutation = useAdvanceMechanicJob();
  const remove = useDeleteMechanicJob();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAdvance = () => {
    if (onAdvance) {
      onAdvance(job);
    } else {
      advanceMutation.mutate(
        { id: job.id, status: job.status },
        { onError: () => toast.error("Erro ao mover card") }
      );
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    remove.mutate(job.id, {
      onError: () => toast.error("Erro ao remover"),
      onSuccess: () => {
        toast.success("Finalizado com sucesso");
        setDeleteDialogOpen(false);
      },
    });
  };

  const total = getTotalPrice(job);
  const showApprovalActions = columnKey === "in_maintenance";
  const showRetreat = columnKey === "in_analysis";

  return (
    <>
      <div className="group bg-card border border-border rounded-2xl p-3 lg:p-4 space-y-3 hover:border-border/80 transition-all hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Bike name (prominent) + actions */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-white uppercase italic leading-tight break-words">
              {job.bike_name || "Sem bike"}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              className="p-1.5 text-muted-foreground/50 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              onClick={() => onEdit(job)}
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button
              className="p-1.5 text-muted-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              onClick={handleDeleteClick}
              disabled={remove.isPending}
            >
              {remove.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Customer info (secondary) */}
        {(job.customer_name || job.customer_whatsapp || job.customer_cpf) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            {job.customer_name && (
              <span className="flex items-center gap-1">
                <User size={9} className="text-muted-foreground/70 shrink-0" /> {job.customer_name}
              </span>
            )}
            {job.customer_whatsapp && (
              <span className="flex items-center gap-1">
                <Phone size={9} className="shrink-0" /> {job.customer_whatsapp}
              </span>
            )}
            {job.customer_cpf && (
              <span className="flex items-center gap-1">
                <CreditCard size={9} className="shrink-0" /> {job.customer_cpf}
              </span>
            )}
          </div>
        )}

        {/* Problem */}
        <div className="p-3 bg-background rounded-xl border border-border/50">
          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-3">{job.problem}</p>
        </div>

        {/* Additions */}
        {job.additions && job.additions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[8px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] ml-1">
              Reparos Extras
            </p>
            {job.additions.map((a) => (
              <AdditionBadge key={a.id} addition={a} showActions={showApprovalActions} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-end pt-1 gap-1.5">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-muted-foreground/70 uppercase tracking-widest">
              Total
            </span>
            <span className="text-sm lg:text-base font-black text-white tracking-tighter">
              {formatBRL(total)}
            </span>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => onAddRepair(job)}
              className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-muted transition-all"
              title="Adicionar reparo"
            >
              <Plus size={10} />
            </button>

            {showRetreat && onRetreat && (
              <button
                onClick={() => onRetreat(job)}
                className="h-6 rounded-md px-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all active:scale-95 border border-amber-500/20"
                title="Retroceder para Em Manutenção"
              >
                <ChevronLeft size={10} /> Voltar
              </button>
            )}

            {!isLast ? (
              <button
                onClick={handleAdvance}
                disabled={advanceMutation.isPending}
                className="h-6 rounded-md px-1.5 bg-primary text-white hover:bg-primary/80 shadow-primary/20 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {advanceMutation.isPending ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <>
                    Avançar <ChevronRight size={10} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDeleteClick}
                disabled={remove.isPending}
                className="h-6 rounded-md px-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 border border-emerald-500/20"
              >
                {remove.isPending ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <>
                    Concluir <Check size={10} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Confirmar exclusão"
        description={`Tem certeza que deseja excluir o serviço "${job.bike_name || "Sem bike"}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
}

// ─── Part Selector for Additions ──────────────────────────────────────────────

function AddRepairPartSelector({
  selectedParts,
  onChange,
}: {
  selectedParts: AdditionPart[];
  onChange: (parts: AdditionPart[]) => void;
}) {
  const { data: allParts = [] } = useParts();
  const [search, setSearch] = useState("");

  const filtered = allParts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedParts.some((sp) => sp.part_id === p.id)
  );

  const addPart = (part: { id: string; name: string; sale_price: number | null }) => {
    onChange([
      ...selectedParts,
      {
        part_id: part.id,
        part_name: part.name,
        quantity: 1,
        unit_price: Number(part.sale_price || 0),
      },
    ]);
    setSearch("");
  };

  const removePart = (index: number) => {
    onChange(selectedParts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, updates: Partial<AdditionPart>) => {
    onChange(selectedParts.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  return (
    <div className="space-y-3">
      {selectedParts.map((part, i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-3 bg-background rounded-xl border border-border"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{part.part_name}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[9px] text-muted-foreground font-bold uppercase">Qtd</label>
                <input
                  type="number"
                  min={1}
                  value={part.quantity}
                  onChange={(e) => updatePart(i, { quantity: Math.max(1, Number(e.target.value)) })}
                  className="w-12 h-7 text-center text-xs font-bold bg-card border border-border rounded-lg outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-1 flex-1">
                <label className="text-[9px] text-muted-foreground font-bold uppercase">Preço</label>
                <CurrencyInput
                  value={part.unit_price}
                  onChange={(val) => updatePart(i, { unit_price: val })}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => removePart(i)}
            className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-colors shrink-0"
          >
            <X size={10} />
          </button>
        </div>
      ))}

      <div className="relative">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar peça pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-card border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
          />
        </div>
        {search.length > 1 && filtered.length > 0 && (
          <div className="absolute z-50 top-12 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => addPart(p)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                <span className="text-[10px] font-bold text-muted-foreground shrink-0 ml-2">
                  {formatBRL(Number(p.sale_price || 0))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Mecanica() {
  const { data: jobs = [], isLoading } = useMechanicJobs();
  const create = useCreateMechanicJob();
  const createServiceOrder = useCreateServiceOrder();
  const createAddition = useCreateAddition();
  const advance = useAdvanceMechanicJob();
  const retreat = useRetreatMechanicJob();
  const updateDetails = useUpdateMechanicJobDetails();

  // Realtime: react to service_order changes
  const handleServiceOrderDone = useCallback((order: ServiceOrder) => {
    playNotifySound();
    toast.success(`🔧 ${order.bike_name || "Bike"} pronta pra entrega!`, {
      description: order.mechanic_name ? `Mecânico: ${order.mechanic_name}` : undefined,
      duration: 8000,
    });
    // Auto-advance matching mechanic_job to "in_analysis"
    const matchingJob = jobs.find(
      (j) => j.problem === order.problem && j.status === "in_maintenance"
    );
    if (matchingJob) {
      advance.mutate({ id: matchingJob.id, status: matchingJob.status });
    }
  }, [jobs, advance]);

  const handleServiceOrderAccepted = useCallback((order: ServiceOrder) => {
    playAcceptSound();
    toast.info(`⚙️ ${order.bike_name || "OS"} aceita por ${order.mechanic_name || "mecânico"}`, {
      duration: 5000,
    });
    // Auto-advance matching mechanic_job to in_maintenance
    const matchingJob = jobs.find(
      (j) => j.problem === order.problem && j.status === "in_repair"
    );
    if (matchingJob) {
      advance.mutate({ id: matchingJob.id, status: matchingJob.status });
    }
  }, [jobs]);

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
  });

  const [mechanicCardOpen, setMechanicCardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addJob, setAddJob] = useState<MechanicJob | null>(null);
  const [addForm, setAddForm] = useState({ problem: "", labor_cost: 0, parts: [] as AdditionPart[] });
  const [mobileTab, setMobileTab] = useState<"in_approval" | "in_repair" | "in_maintenance" | "in_analysis" | "ready">("in_approval");

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editJob, setEditJob] = useState<MechanicJob | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    bike_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    problem: "",
    price: 0,
  });

  const grouped = useMemo(() => {
    const map: Record<string, MechanicJob[]> = {
      in_approval: [],
      in_repair: [],
      in_maintenance: [],
      in_analysis: [],
      ready: [],
    };
    jobs.forEach((j) => {
      if (map[j.status]) map[j.status].push(j);
    });
    return map;
  }, [jobs]);

  const handleSave = () => {
    if (!form.problem.trim()) {
      toast.error("Descreva o problema");
      return;
    }
    const orderData = {
      customer_name: form.customer_name || undefined,
      customer_cpf: form.customer_cpf || undefined,
      customer_whatsapp: form.customer_whatsapp || undefined,
      customer_id: form.customer_id || undefined,
      bike_name: form.bike_name || undefined,
      problem: form.problem,
      price: form.price,
      status: form.initialStatus,
    };
    create.mutate(orderData, {
      onSuccess: () => {
        // Only create service_order if going to "Na Mecânica"
        if (form.initialStatus === "in_repair") {
          createServiceOrder.mutate({
            customer_name: form.customer_name || undefined,
            customer_cpf: form.customer_cpf || undefined,
            customer_whatsapp: form.customer_whatsapp || undefined,
            customer_id: form.customer_id || undefined,
            bike_name: form.bike_name || undefined,
            problem: form.problem,
          });
        }
        toast.success("Manutenção criada!");
        setForm({
          customer_name: "",
          bike_name: "",
          customer_cpf: "",
          customer_whatsapp: "",
          customer_id: null,
          problem: "",
          price: 0,
          initialStatus: "in_approval",
        });
        setOpen(false);
      },
      onError: () => toast.error("Erro ao criar"),
    });
  };

  const handleAddRepair = (job: MechanicJob) => {
    setAddJob(job);
    setAddForm({ problem: "", labor_cost: 0, parts: [] });
    setAddOpen(true);
  };

  const handleEditJob = (job: MechanicJob) => {
    setEditJob(job);
    setEditForm({
      customer_name: job.customer_name || "",
      bike_name: job.bike_name || "",
      customer_cpf: job.customer_cpf || "",
      customer_whatsapp: job.customer_whatsapp || "",
      customer_id: job.customer_id || null,
      problem: job.problem,
      price: job.price,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editJob || !editForm.problem.trim()) {
      toast.error("Descreva o problema");
      return;
    }
    updateDetails.mutate(
      {
        id: editJob.id,
        customer_name: editForm.customer_name || null,
        customer_cpf: editForm.customer_cpf || null,
        customer_whatsapp: editForm.customer_whatsapp || null,
        customer_id: editForm.customer_id || null,
        bike_name: editForm.bike_name || null,
        problem: editForm.problem,
        price: editForm.price,
      },
      {
        onSuccess: () => {
          toast.success("Serviço atualizado!");
          setEditOpen(false);
          setEditJob(null);
        },
        onError: () => toast.error("Erro ao atualizar"),
      }
    );
  };

  const handleRetreatJob = (job: MechanicJob) => {
    retreat.mutate(
      { id: job.id },
      {
        onSuccess: () => toast.success("Retornado para 'Em Manutenção'"),
        onError: () => toast.error("Erro ao retroceder"),
      }
    );
  };

  // Special advance handler for "Em Aprovação" → "Na Mecânica": also create service_order
  const handleAdvanceFromApproval = (job: MechanicJob) => {
    advance.mutate(
      { id: job.id, status: job.status },
      {
        onSuccess: () => {
          // Create service_order when moving to Na Mecânica
          createServiceOrder.mutate({
            customer_name: job.customer_name || undefined,
            customer_cpf: job.customer_cpf || undefined,
            customer_whatsapp: job.customer_whatsapp || undefined,
            customer_id: job.customer_id || undefined,
            bike_name: job.bike_name || undefined,
            problem: job.problem,
          });
          toast.success("Enviado para a mecânica!");
        },
        onError: () => toast.error("Erro ao mover card"),
      }
    );
  };

  const handleSaveAddition = () => {
    if (!addJob || !addForm.problem.trim()) {
      toast.error("Descreva o novo problema");
      return;
    }
    const partsTotal = addForm.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);
    const totalPrice = addForm.labor_cost + partsTotal;
    createAddition.mutate(
      {
        job_id: addJob.id,
        problem: addForm.problem,
        price: totalPrice,
        labor_cost: addForm.labor_cost,
        parts_used: addForm.parts,
      },
      {
        onSuccess: () => {
          toast.success("Reparo adicional registrado!");
          setAddOpen(false);
          setAddJob(null);
        },
        onError: () => toast.error("Erro ao adicionar reparo"),
      }
    );
  };

  const pendingApprovals = jobs.filter((j) =>
    j.additions?.some((a) => a.approval === "pending")
  ).length;

  const avgTicket =
    jobs.length > 0
      ? jobs.reduce((sum, j) => sum + getTotalPrice(j), 0) / jobs.length
      : 0;

  // Mobile tab columns (includes in_repair for mobile)
  const allMobileTabs = [
    { key: "in_approval" as const, label: "Em Aprovação", icon: FileCheck, color: "text-yellow-400", bg: "bg-yellow-400/5", border: "border-yellow-400/20" },
    { key: "in_repair" as const, label: "Na Mecânica", icon: Wrench, color: "text-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/20" },
    ...columns.slice(1),
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background text-foreground selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="w-full mx-auto p-4 md:p-6 space-y-6 md:space-y-10 overflow-x-hidden">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30 shrink-0">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-primary">
                SERVICE CENTER
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight italic uppercase text-white">
              Mecânica
            </h1>
            <p className="text-muted-foreground font-medium text-sm">Gerencie os serviços de manutenção</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="flex-1 sm:flex-none h-10 md:h-12 px-3 md:px-6 rounded-2xl border border-border bg-transparent text-foreground/80 hover:bg-muted text-[11px] md:text-sm font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap min-w-0">
              <History size={14} className="shrink-0" /> <span className="truncate">Histórico de O.S</span>
            </button>
            <button
              onClick={() => setOpen(true)}
              className="flex-1 sm:flex-none h-10 md:h-12 px-3 md:px-8 rounded-2xl bg-primary text-white hover:bg-primary/80 shadow-primary/30 text-[11px] md:text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap min-w-0"
            >
              <Plus size={14} className="stroke-[3] shrink-0" /> <span className="truncate">Nova Manutenção</span>
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <SummaryStat
            title="Total em Oficina"
            value={jobs.length}
            icon={<Activity size={16} />}
          />
          <SummaryStat
            title="Em Aprovação"
            value={grouped.in_approval.length}
            icon={<FileCheck size={16} />}
            color="text-yellow-400"
          />
          <SummaryStat
            title="Pendente Aprovação"
            value={pendingApprovals}
            icon={<AlertCircle size={16} />}
            color="text-indigo-400"
          />
          <SummaryStat
            title="Ticket Médio"
            value={formatBRL(avgTicket)}
            icon={<TrendingUp size={16} />}
            color="text-emerald-400"
          />
        </div>

        {/* Kanban */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : (
          <>
            {/* Mobile tabs */}
            <div className="flex md:hidden overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {allMobileTabs.map((col) => {
                const active = mobileTab === col.key;
                return (
                  <button
                    key={col.key}
                    onClick={() => setMobileTab(col.key)}
                    className={`snap-start shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                      active
                        ? `${col.bg} ${col.border} ${col.color}`
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    <col.icon size={14} />
                    <span className="whitespace-nowrap">{col.label}</span>
                    <span className={`ml-1 text-[10px] ${active ? "opacity-100" : "opacity-50"}`}>
                      ({grouped[col.key]?.length || 0})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mobile: single column based on active tab */}
            <div className="md:hidden">
              <div className="space-y-4">
                {(grouped[mobileTab]?.length || 0) > 0 ? (
                  grouped[mobileTab]?.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isLast={mobileTab === "ready"}
                      columnKey={mobileTab}
                      onAddRepair={handleAddRepair}
                      onEdit={handleEditJob}
                      onRetreat={handleRetreatJob}
                      onAdvance={mobileTab === "in_approval" ? handleAdvanceFromApproval : undefined}
                    />
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3 opacity-20">
                    <Layers className="mx-auto" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Coluna Vazia
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop: "Na Mecânica" button that opens a modal */}
            {grouped.in_repair.length > 0 && (
              <div className="hidden md:flex justify-center">
                <button
                  onClick={() => setMechanicCardOpen(true)}
                  className="bg-card/60 border border-amber-400/15 rounded-2xl px-5 py-2.5 flex items-center justify-center gap-2 hover:border-amber-400/30 transition-all"
                >
                  <Wrench size={14} className="text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    Na Mecânica ({grouped.in_repair.length})
                  </span>
                </button>
              </div>
            )}

            {/* Desktop: 4 columns */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex-1 min-w-0 flex flex-col bg-card/50 rounded-3xl p-2 border border-border/30"
                >
                  <ColumnHeader {...col} count={grouped[col.key].length} />
                  <div className="px-1.5 space-y-3 pb-6 flex-1">
                    {grouped[col.key].length > 0 ? (
                      grouped[col.key].map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isLast={col.key === "ready"}
                          columnKey={col.key}
                          onAddRepair={handleAddRepair}
                          onEdit={handleEditJob}
                          onRetreat={handleRetreatJob}
                          onAdvance={col.key === "in_approval" ? handleAdvanceFromApproval : undefined}
                        />
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
                        <Layers className="mx-auto" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-3">
                          Coluna Vazia
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── New Maintenance Modal ────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tight">
                Nova Ordem de Serviço
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <InputGroup label="Nome da Bike *">
                <PremiumInput
                  placeholder="Ex: Caloi Elite Carbon"
                  value={form.bike_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bike_name: e.target.value }))
                  }
                />
              </InputGroup>
              <InputGroup label="Cliente">
                <CustomerAutocomplete
                  customerName={form.customer_name}
                  customerWhatsapp={form.customer_whatsapp}
                  customerCpf={form.customer_cpf}
                  onSelect={(c: Customer) =>
                    setForm((f) => ({
                      ...f,
                      customer_name: c.name,
                      customer_whatsapp: c.whatsapp || "",
                      customer_cpf: c.cpf || "",
                      customer_id: c.id,
                    }))
                  }
                  onChange={(field, value) => {
                    const key = field === "name" ? "customer_name" : field === "whatsapp" ? "customer_whatsapp" : "customer_cpf";
                    setForm((f) => ({ ...f, [key]: value }));
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <PremiumInput
                    placeholder="Nome completo"
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customer_name: e.target.value }))
                    }
                  />
                  <PremiumInput
                    placeholder="(00) 00000-0000"
                    value={form.customer_whatsapp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customer_whatsapp: e.target.value }))
                    }
                  />
                  <PremiumInput
                    placeholder="CPF (opcional)"
                    value={form.customer_cpf}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customer_cpf: e.target.value }))
                    }
                  />
                </div>
              </InputGroup>
              <InputGroup label="Diagnóstico Inicial *">
                <PremiumTextarea
                  rows={4}
                  placeholder="Descreva o que precisa ser feito..."
                  value={form.problem}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, problem: e.target.value }))
                  }
                />
              </InputGroup>
              <InputGroup label="Valor do Serviço">
                <CurrencyInput
                  value={form.price}
                  onChange={(val) => setForm((f) => ({ ...f, price: val }))}
                />
              </InputGroup>

              {/* Situation picker - last item */}
              <InputGroup label="Qual a situação? *">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, initialStatus: "in_approval" }))}
                    className={`h-14 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      form.initialStatus === "in_approval"
                        ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <FileCheck size={16} /> Em Aprovação
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, initialStatus: "in_repair" }))}
                    className={`h-14 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      form.initialStatus === "in_repair"
                        ? "border-amber-400 bg-amber-400/10 text-amber-400"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Wrench size={16} /> Na Mecânica
                  </button>
                </div>
              </InputGroup>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={create.isPending}
                className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {create.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Abrir Serviço"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Repair Modal ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tight">
                Adicionar Reparo Extra
              </DialogTitle>
            </DialogHeader>

            {addJob && (
              <div className="space-y-6">
                {/* Job summary */}
                <div className="p-5 bg-background rounded-[28px] border border-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Wrench size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white leading-none mb-1 truncate">
                      {addJob.customer_name || "Cliente"}
                    </p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest italic truncate">
                      {addJob.problem}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">
                      Valor atual: {formatBRL(getTotalPrice(addJob))}
                    </p>
                  </div>
                </div>

                <InputGroup label="Problema / Descrição *">
                  <PremiumTextarea
                    rows={2}
                    placeholder="Ex: Troca de corrente e ajuste de câmbio..."
                    value={addForm.problem}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, problem: e.target.value }))
                    }
                  />
                </InputGroup>

                {/* Parts selector */}
                <InputGroup label="Peças Utilizadas">
                  <AddRepairPartSelector
                    selectedParts={addForm.parts}
                    onChange={(parts) => setAddForm((f) => ({ ...f, parts }))}
                  />
                </InputGroup>

                <InputGroup label="Mão de Obra">
                  <CurrencyInput
                    value={addForm.labor_cost}
                    onChange={(val) => setAddForm((f) => ({ ...f, labor_cost: val }))}
                  />
                </InputGroup>

                {/* Total preview */}
                <div className="p-4 bg-background rounded-2xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total deste reparo</span>
                    <span className="text-lg font-black text-white">
                      {formatBRL(
                        addForm.labor_cost +
                        addForm.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAddition}
                disabled={createAddition.isPending}
                className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {createAddition.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Registrar Pendência"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Job Modal ───────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tight">
                Editar Serviço
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <InputGroup label="Nome da Bike *">
                <PremiumInput
                  placeholder="Ex: Caloi Elite Carbon"
                  value={editForm.bike_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, bike_name: e.target.value }))
                  }
                />
              </InputGroup>
              <InputGroup label="Cliente">
                <CustomerAutocomplete
                  customerName={editForm.customer_name}
                  customerWhatsapp={editForm.customer_whatsapp}
                  customerCpf={editForm.customer_cpf}
                  onSelect={(c: Customer) =>
                    setEditForm((f) => ({
                      ...f,
                      customer_name: c.name,
                      customer_whatsapp: c.whatsapp || "",
                      customer_cpf: c.cpf || "",
                      customer_id: c.id,
                    }))
                  }
                  onChange={(field, value) => {
                    const key = field === "name" ? "customer_name" : field === "whatsapp" ? "customer_whatsapp" : "customer_cpf";
                    setEditForm((f) => ({ ...f, [key]: value }));
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <PremiumInput
                    placeholder="Nome completo"
                    value={editForm.customer_name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, customer_name: e.target.value }))
                    }
                  />
                  <PremiumInput
                    placeholder="(00) 00000-0000"
                    value={editForm.customer_whatsapp}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, customer_whatsapp: e.target.value }))
                    }
                  />
                  <PremiumInput
                    placeholder="CPF (opcional)"
                    value={editForm.customer_cpf}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, customer_cpf: e.target.value }))
                    }
                  />
                </div>
              </InputGroup>
              <InputGroup label="Diagnóstico *">
                <PremiumTextarea
                  rows={4}
                  placeholder="Descreva o que precisa ser feito..."
                  value={editForm.problem}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, problem: e.target.value }))
                  }
                />
              </InputGroup>
              <InputGroup label="Valor do Serviço">
                <CurrencyInput
                  value={editForm.price}
                  onChange={(val) => setEditForm((f) => ({ ...f, price: val }))}
                />
              </InputGroup>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateDetails.isPending}
                className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {updateDetails.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Na Mecânica Modal ────────────────────────────────────────────────── */}
      <Dialog open={mechanicCardOpen} onOpenChange={setMechanicCardOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
          <div className="p-6 md:p-8 space-y-4 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-white italic uppercase tracking-tight">
                <Wrench size={18} className="text-amber-400" /> Na Mecânica
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {grouped.in_repair.length > 0 ? (
                grouped.in_repair.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isLast={false}
                    columnKey="in_repair"
                    onAddRepair={handleAddRepair}
                    onEdit={handleEditJob}
                    onRetreat={handleRetreatJob}
                  />
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
    </div>
  );
}
