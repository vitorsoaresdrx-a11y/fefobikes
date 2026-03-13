import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  CreditCard,
  ShoppingCart,
  Wrench,
  FileText,
  DollarSign,
  Edit2,
  Save,
  X,
  StickyNote,
} from "lucide-react";
import { useCustomers, useUpdateCustomer, useCustomerWithSales, useCustomerServiceOrders, useCustomerQuotes, useCustomerMechanicJobs } from "@/hooks/useCustomers";
import { formatBRL } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: customers = [] } = useCustomers();
  const updateCustomer = useUpdateCustomer();
  const customer = customers.find((c) => c.id === id);

  const { data: sales = [] } = useCustomerWithSales(id);
  const { data: serviceOrders = [] } = useCustomerServiceOrders(id);
  const { data: mechanicJobs = [] } = useCustomerMechanicJobs(id);
  const { data: quotes = [] } = useCustomerQuotes(id);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", whatsapp: "", cpf: "", notes: "" });
  const [activeTab, setActiveTab] = useState<"compras" | "servicos" | "orcamentos">("compras");

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cliente não encontrado</p>
      </div>
    );
  }

  const totalSpent = (sales as any[]).reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
  const totalServices = (mechanicJobs as any[]).reduce((sum: number, j: any) => sum + Number(j.price || 0), 0);
  const totalQuotes = (quotes as any[]).reduce((sum: number, q: any) => sum + Number(q.total || 0), 0);

  const startEdit = () => {
    setEditForm({
      name: customer.name,
      whatsapp: customer.whatsapp || "",
      cpf: customer.cpf || "",
      notes: customer.notes || "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    updateCustomer.mutate(
      {
        id: customer.id,
        name: editForm.name,
        whatsapp: editForm.whatsapp || null,
        cpf: editForm.cpf || null,
        notes: editForm.notes || null,
      },
      {
        onSuccess: () => {
          toast.toast({ title: "Cliente atualizado!" });
          setEditing(false);
        },
        onError: () => toast.toast({ title: "Erro ao atualizar", variant: "destructive" }),
      }
    );
  };

  const tabs = [
    { key: "compras" as const, label: "Compras", icon: ShoppingCart, count: (sales as any[]).length },
    { key: "servicos" as const, label: "Serviços", icon: Wrench, count: (mechanicJobs as any[]).length },
    { key: "orcamentos" as const, label: "Orçamentos", icon: FileText, count: (quotes as any[]).length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/clientes")}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white truncate">
              {customer.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Cliente desde {formatDate(customer.created_at)}
            </p>
          </div>
          {!editing ? (
            <button
              onClick={startEdit}
              className="h-10 px-4 rounded-2xl bg-card border border-border text-muted-foreground hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <Edit2 size={14} /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="h-10 px-3 rounded-2xl border border-border text-muted-foreground hover:text-white text-xs font-bold transition-colors"
              >
                <X size={14} />
              </button>
              <button
                onClick={saveEdit}
                disabled={updateCustomer.isPending}
                className="h-10 px-4 rounded-2xl bg-primary text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                <Save size={14} /> Salvar
              </button>
            </div>
          )}
        </div>

        {/* Customer Info Card */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest block mb-1">Nome</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest block mb-1">WhatsApp</label>
                <input
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest block mb-1">CPF</label>
                <input
                  value={editForm.cpf}
                  onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest block mb-1">Notas</label>
                <input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm text-white"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <User size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Nome</p>
                  <p className="text-sm font-bold text-white">{customer.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">WhatsApp</p>
                  {customer.whatsapp ? (
                    <a
                      href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      {customer.whatsapp}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">CPF</p>
                  <p className="text-sm font-bold text-white">{customer.cpf || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StickyNote size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Notas</p>
                  <p className="text-sm text-muted-foreground">{customer.notes || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-emerald-400/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Total Gasto</p>
            <p className="text-xl font-black text-emerald-400">{formatBRL(totalSpent)}</p>
          </div>
          <div className="bg-card border border-primary/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Compras</p>
            <p className="text-xl font-black text-primary">{(sales as any[]).length}</p>
          </div>
          <div className="bg-card border border-amber-400/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Serviços</p>
            <p className="text-xl font-black text-amber-400">{(mechanicJobs as any[]).length}</p>
          </div>
          <div className="bg-card border border-purple-400/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Orçamentos</p>
            <p className="text-xl font-black text-purple-400">{(quotes as any[]).length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-white"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              <span className="ml-1 opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === "compras" && (
            (sales as any[]).length === 0 ? (
              <EmptyState text="Nenhuma compra registrada" />
            ) : (
              (sales as any[]).map((sale: any) => (
                <div key={sale.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white uppercase">{formatDateTime(sale.created_at)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sale.payment_method || "Sem método"} • {sale.sale_items?.length || 0} ite{sale.sale_items?.length === 1 ? "m" : "ns"}
                      </p>
                    </div>
                    <p className="text-lg font-black text-emerald-400">{formatBRL(sale.total)}</p>
                  </div>
                  {sale.sale_items && sale.sale_items.length > 0 && (
                    <div className="border-t border-border pt-2 space-y-1">
                      {sale.sale_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.quantity}x {item.description}</span>
                          <span className="text-muted-foreground">{formatBRL(item.unit_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          )}

          {activeTab === "servicos" && (
            (mechanicJobs as any[]).length === 0 ? (
              <EmptyState text="Nenhum serviço registrado" />
            ) : (
              (mechanicJobs as any[]).map((job: any) => (
                <div key={job.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-white italic uppercase">{job.bike_name || "Sem bike"}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(job.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-400">{formatBRL(job.price)}</p>
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{job.problem}</p>
                </div>
              ))
            )
          )}

          {activeTab === "orcamentos" && (
            (quotes as any[]).length === 0 ? (
              <EmptyState text="Nenhum orçamento registrado" />
            ) : (
              (quotes as any[]).map((quote: any) => (
                <div key={quote.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white uppercase">{formatDateTime(quote.created_at)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {quote.quote_items?.length || 0} peça{(quote.quote_items?.length || 0) !== 1 ? "s" : ""}
                        {quote.labor_cost > 0 ? ` + Mão de obra ${formatBRL(quote.labor_cost)}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-purple-400">{formatBRL(quote.total)}</p>
                      <StatusBadge status={quote.status} />
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted-foreground/70">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in_repair: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    in_maintenance: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_analysis: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  const labels: Record<string, string> = {
    in_repair: "Na mecânica",
    in_maintenance: "Em manutenção",
    in_analysis: "Em análise",
    ready: "Pronta",
    pending: "Pendente",
    approved: "Aprovado",
  };

  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${colors[status] || "bg-muted text-muted-foreground border-border/80"}`}>
      {labels[status] || status}
    </span>
  );
}
