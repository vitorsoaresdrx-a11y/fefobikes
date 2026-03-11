import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  useMechanicJobs,
  useCreateMechanicJob,
  useAdvanceMechanicJob,
  useDeleteMechanicJob,
  type MechanicJob,
} from "@/hooks/useMechanicJobs";
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
} from "lucide-react";
import { toast } from "sonner";

const columns = [
  {
    key: "in_repair" as const,
    label: "Na Mecânica",
    icon: Wrench,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  {
    key: "in_maintenance" as const,
    label: "Em Manutenção",
    icon: Settings,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    key: "ready" as const,
    label: "Pronta pra Retirada",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
];

function JobCard({
  job,
  isLast,
}: {
  job: MechanicJob;
  isLast: boolean;
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
      onSuccess: () => toast.success("Removido"),
    });
  };

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        {job.customer_name && (
          <div className="flex items-center gap-2 text-sm text-foreground font-medium">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {job.customer_name}
          </div>
        )}
        {job.customer_cpf && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            {job.customer_cpf}
          </div>
        )}
        {job.customer_whatsapp && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {job.customer_whatsapp}
          </div>
        )}

        <p className="text-sm text-foreground/80 leading-relaxed">
          {job.problem}
        </p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-primary">
            R$ {Number(job.price).toFixed(2)}
          </span>

          <div className="flex gap-1">
            {!isLast && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={handleAdvance}
                disabled={advance.isPending}
              >
                Próximo <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            {isLast && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3 w-3" /> Finalizar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Mecanica() {
  const { data: jobs = [], isLoading } = useMechanicJobs();
  const create = useCreateMechanicJob();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    problem: "",
    price: "",
  });

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
          setForm({ customer_name: "", customer_cpf: "", customer_whatsapp: "", problem: "", price: "" });
          setOpen(false);
        },
        onError: () => toast.error("Erro ao criar"),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mecânica</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os serviços de manutenção
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Manutenção
        </Button>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="space-y-3">
              <div
                className={`flex items-center gap-2 rounded-lg border p-3 ${col.border} ${col.bg}`}
              >
                <col.icon className={`h-4 w-4 ${col.color}`} />
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {grouped[col.key].length}
                </span>
              </div>

              <div className="space-y-2 min-h-[120px]">
                {grouped[col.key].map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isLast={col.key === "ready"}
                  />
                ))}
                {grouped[col.key].length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Nenhum serviço
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Manutenção</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do cliente</Label>
                <Input
                  placeholder="Opcional"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customer_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input
                  placeholder="Opcional"
                  value={form.customer_cpf}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customer_cpf: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                placeholder="Opcional"
                value={form.customer_whatsapp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customer_whatsapp: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Problema da bike *</Label>
              <Textarea
                placeholder="Descreva o problema..."
                value={form.problem}
                onChange={(e) =>
                  setForm((f) => ({ ...f, problem: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Valor do serviço (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={create.isPending}>
              {create.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
