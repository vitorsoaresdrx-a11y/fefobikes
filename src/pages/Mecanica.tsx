import { useState, useMemo } from "react";
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
  Layers,
  History,
  TrendingUp,
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
  type MechanicJob,
  type MechanicJobAddition,
} from "@/hooks/useMechanicJobs";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBRL = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getTotalPrice(job: MechanicJob) {
  const base = Number(job.price);
  const accepted = (job.additions || [])
    .filter((a) => a.approval === "accepted")
    .reduce((sum, a) => sum + Number(a.price), 0);
  return base + accepted;
}

// ─── Column config ────────────────────────────────────────────────────────────

const columns = [
  {
    key: "in_repair" as const,
    label: "Na Mecânica",
    icon: Wrench,
    color: "text-amber-400",
    bg: "bg-amber-400/5",
    border: "border-amber-400/20",
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
  <div className="bg-[#161618] border border-zinc-800 p-6 rounded-[32px] flex items-center gap-4 hover:border-zinc-700 transition-all">
    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{title}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
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
  <div className={`flex items-center gap-3 p-5 rounded-[24px] border ${border} ${bg} mb-6`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-white/5 shadow-inner`}>
      <Icon size={20} className="stroke-[2.5]" />
    </div>
    <div>
      <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{label}</h3>
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{count} serviços ativos</p>
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
    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    {children}
  </div>
);

const PremiumInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className="w-full h-14 bg-[#161618] border border-zinc-800 rounded-2xl px-5 text-sm font-semibold text-zinc-100 outline-none focus:border-[#2952FF] focus:shadow-[0_0_0_1px_rgba(41,82,255,0.1)] transition-all placeholder:text-zinc-600"
    {...props}
  />
);

const PremiumTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className="w-full bg-[#161618] border border-zinc-800 rounded-[20px] p-5 text-sm text-zinc-100 outline-none focus:border-[#2952FF] transition-all resize-none placeholder:text-zinc-600 leading-relaxed"
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

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border ${styles[addition.approval]} transition-all ${addition.approval === "pending" ? "animate-pulse" : ""}`}
    >
      <div className="flex items-center gap-2 overflow-hidden min-w-0">
        {icons[addition.approval]}
        <span
          className={`text-[10px] font-bold truncate ${addition.approval === "refused" ? "line-through" : ""}`}
        >
          {addition.problem}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-2">
        <span className="text-[10px] font-black">{formatBRL(Number(addition.price))}</span>
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
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  isLast,
  columnKey,
  onAddRepair,
}: {
  job: MechanicJob;
  isLast: boolean;
  columnKey: string;
  onAddRepair: (job: MechanicJob) => void;
}) {
  const advance = useAdvanceMechanicJob();
  const remove = useDeleteMechanicJob();

  const handleAdvance = () => {
    advance.mutate(
      { id: job.id, status: job.status },
      { onError: () => toast.error("Erro ao mover card") }
    );
  };

  const handleDelete = () => {
    remove.mutate(job.id, {
      onError: () => toast.error("Erro ao remover"),
      onSuccess: () => toast.success("Finalizado com sucesso"),
    });
  };

  const total = getTotalPrice(job);
  const showApprovalActions = columnKey === "in_maintenance";

  return (
    <div className="group bg-[#161618] border border-zinc-800 rounded-[32px] p-6 space-y-5 hover:border-zinc-700 transition-all hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
      {/* Customer info */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          {job.customer_name && (
            <div className="flex items-center gap-2">
              <User size={14} className="text-[#2952FF] shrink-0" />
              <span className="text-sm font-black tracking-tight text-white uppercase italic truncate">
                {job.customer_name}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {job.customer_whatsapp && (
              <span className="flex items-center gap-1">
                <Phone size={10} /> {job.customer_whatsapp}
              </span>
            )}
            {job.customer_cpf && (
              <span className="flex items-center gap-1">
                <CreditCard size={10} /> {job.customer_cpf}
              </span>
            )}
          </div>
        </div>
        <button
          className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          onClick={handleDelete}
          disabled={remove.isPending}
        >
          {remove.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>

      {/* Problem */}
      <div className="p-4 bg-[#0A0A0B] rounded-2xl border border-zinc-800/50">
        <p className="text-xs font-medium text-zinc-400 leading-relaxed">{job.problem}</p>
      </div>

      {/* Additions */}
      {job.additions && job.additions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">
            Reparos Extras
          </p>
          {job.additions.map((a) => (
            <AdditionBadge key={a.id} addition={a} showActions={showApprovalActions} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
            Orçamento Total
          </span>
          <span className="text-lg font-black text-white tracking-tighter">
            {formatBRL(total)}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAddRepair(job)}
            className="w-8 h-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <Plus size={14} />
          </button>

          {!isLast ? (
            <button
              onClick={handleAdvance}
              disabled={advance.isPending}
              className="h-8 rounded-xl px-4 bg-[#2952FF] text-white hover:bg-[#3D63FF] shadow-[0_0_20px_rgba(41,82,255,0.2)] text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            >
              {advance.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  Avançar <ChevronRight size={12} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={remove.isPending}
              className="h-8 rounded-xl px-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 border border-emerald-500/20"
            >
              {remove.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  Concluir <Check size={12} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Mecanica() {
  const { data: jobs = [], isLoading } = useMechanicJobs();
  const create = useCreateMechanicJob();
  const createAddition = useCreateAddition();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    problem: "",
    price: "",
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addJob, setAddJob] = useState<MechanicJob | null>(null);
  const [addForm, setAddForm] = useState({ problem: "", price: "" });

  const grouped = useMemo(() => {
    const map: Record<string, MechanicJob[]> = {
      in_repair: [],
      in_maintenance: [],
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
    create.mutate(
      {
        customer_name: form.customer_name || undefined,
        customer_cpf: form.customer_cpf || undefined,
        customer_whatsapp: form.customer_whatsapp || undefined,
        problem: form.problem,
        price: Number(form.price) || 0,
      },
      {
        onSuccess: () => {
          toast.success("Manutenção criada!");
          setForm({
            customer_name: "",
            customer_cpf: "",
            customer_whatsapp: "",
            problem: "",
            price: "",
          });
          setOpen(false);
        },
        onError: () => toast.error("Erro ao criar"),
      }
    );
  };

  const handleAddRepair = (job: MechanicJob) => {
    setAddJob(job);
    setAddForm({ problem: "", price: "" });
    setAddOpen(true);
  };

  const handleSaveAddition = () => {
    if (!addJob || !addForm.problem.trim()) {
      toast.error("Descreva o novo problema");
      return;
    }
    createAddition.mutate(
      {
        job_id: addJob.id,
        problem: addForm.problem,
        price: Number(addForm.price) || 0,
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

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 selection:bg-[#2952FF]/30">
      <div className="max-w-[1400px] mx-auto p-6 md:p-12 space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#66B3FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(102,179,255,0.3)]">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#66B3FF]">
                SERVICE CENTER
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight italic uppercase text-white">
              Mecânica
            </h1>
            <p className="text-zinc-500 font-medium">Gerencie os serviços de manutenção</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="h-12 px-6 rounded-2xl border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 text-sm font-bold flex items-center gap-2 transition-all">
              <History size={18} /> Histórico de O.S
            </button>
            <button
              onClick={() => setOpen(true)}
              className="h-12 px-8 rounded-2xl bg-[#66B3FF] text-white hover:bg-[#85C4FF] shadow-[0_0_20px_rgba(102,179,255,0.3)] text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} className="stroke-[3]" /> Nova Manutenção
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryStat
            title="Total em Oficina"
            value={jobs.length}
            icon={<Activity size={16} />}
          />
          <SummaryStat
            title="Fila de Espera"
            value={grouped.in_repair.length}
            icon={<Clock size={16} />}
            color="text-amber-400"
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
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex flex-col min-h-[600px] bg-[#111113]/50 rounded-[40px] p-2 border border-zinc-800/30"
              >
                <ColumnHeader {...col} count={grouped[col.key].length} />
                <div className="px-2 space-y-4 pb-10">
                  {grouped[col.key].length > 0 ? (
                    grouped[col.key].map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isLast={col.key === "ready"}
                        columnKey={col.key}
                        onAddRepair={handleAddRepair}
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
            ))}
          </div>
        )}
      </div>

      {/* ── New Maintenance Modal ────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1C1C1E] border-zinc-800 rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl">
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tight">
                Nova Ordem de Serviço
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Nome do Cliente">
                  <PremiumInput
                    placeholder="Nome completo"
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customer_name: e.target.value }))
                    }
                  />
                </InputGroup>
                <InputGroup label="WhatsApp">
                  <PremiumInput
                    placeholder="(00) 00000-0000"
                    value={form.customer_whatsapp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customer_whatsapp: e.target.value }))
                    }
                  />
                </InputGroup>
              </div>
              <InputGroup label="CPF (opcional)">
                <PremiumInput
                  placeholder="000.000.000-00"
                  value={form.customer_cpf}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customer_cpf: e.target.value }))
                  }
                />
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
                <div className="relative">
                  <PremiumInput
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    className="pl-12"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold pointer-events-none">
                    R$
                  </span>
                </div>
              </InputGroup>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-zinc-800 text-zinc-400 hover:bg-zinc-800 text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={create.isPending}
                className="flex-[2] h-12 rounded-2xl bg-[#66B3FF] text-white hover:bg-[#85C4FF] text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
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
        <DialogContent className="bg-[#1C1C1E] border-zinc-800 rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl">
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tight">
                Adicionar Reparo Extra
              </DialogTitle>
            </DialogHeader>

            {addJob && (
              <div className="space-y-6">
                {/* Job summary */}
                <div className="p-5 bg-zinc-900 rounded-[28px] border border-zinc-800 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                    <Wrench size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white leading-none mb-1 truncate">
                      {addJob.customer_name || "Cliente"}
                    </p>
                    <p className="text-[10px] font-black text-[#66B3FF] uppercase tracking-widest italic truncate">
                      {addJob.problem}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 mt-1">
                      Valor atual: {formatBRL(getTotalPrice(addJob))}
                    </p>
                  </div>
                </div>

                <InputGroup label="Problema Encontrado *">
                  <PremiumTextarea
                    rows={3}
                    placeholder="Descreva a nova peça ou serviço necessário..."
                    value={addForm.problem}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, problem: e.target.value }))
                    }
                  />
                </InputGroup>
                <InputGroup label="Custo Adicional">
                  <div className="relative">
                    <PremiumInput
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0,00"
                      value={addForm.price}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, price: e.target.value }))
                      }
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold pointer-events-none">
                      R$
                    </span>
                  </div>
                </InputGroup>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-zinc-800 text-zinc-400 hover:bg-zinc-800 text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAddition}
                disabled={createAddition.isPending}
                className="flex-[2] h-12 rounded-2xl bg-[#66B3FF] text-white hover:bg-[#85C4FF] text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
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
    </div>
  );
}
