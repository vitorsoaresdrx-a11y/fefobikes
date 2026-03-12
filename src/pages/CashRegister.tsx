import { useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  Lock,
  Unlock,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Banknote,
  ArrowRight,
  X,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  useCurrentCashRegister,
  useOpenCashRegister,
  useCloseCashRegister,
  useCashRegisterHistory,
  useCashRegisterCashTotal,
  useCashRegisterSales,
} from "@/hooks/useCashRegister";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { formatBRL } from "@/lib/format";

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Design primitives ──────────────────────────────────────────────────────

const Btn = ({
  children, variant = "primary", className = "", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive" }) => {
  const v: Record<string, string> = {
    primary: "bg-[#2952FF] text-white hover:bg-[#4A6FFF] shadow-[0_0_20px_rgba(41,82,255,0.3)]",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800",
    destructive: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  };
  return (
    <button className={`inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-50 font-bold text-sm h-12 px-6 ${v[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const InputEl = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full bg-[#161618] border border-zinc-800 rounded-2xl px-4 h-14 text-zinc-100 outline-none focus:border-[#2952FF] transition-all placeholder:text-zinc-600 text-lg font-bold ${className}`}
    {...props}
  />
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function CashRegister() {
  const { toast } = useToast();
  const { data: currentRegister, isLoading } = useCurrentCashRegister();
  const { data: history = [] } = useCashRegisterHistory();
  const openRegister = useOpenCashRegister();
  const closeRegister = useCloseCashRegister();
  const { data: cashTotals } = useCashRegisterCashTotal(currentRegister?.id || null);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(0);
  const [closingAmount, setClosingAmount] = useState(0);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const isOpen = currentRegister?.status === "open";

  const handleOpen = async () => {
    const amount = openingAmount;
    try {
      await openRegister.mutateAsync(amount);
      toast({ title: "Caixa aberto com sucesso!" });
      setShowOpenModal(false);
      setOpeningAmount(0);
    } catch {
      toast({ title: "Erro ao abrir caixa", variant: "destructive" });
    }
  };

  const handleClose = async () => {
    if (!currentRegister) return;
    const closing = closingAmount;
    const expected = (currentRegister.opening_amount || 0) + (cashTotals?.total || 0);
    try {
      await closeRegister.mutateAsync({ id: currentRegister.id, closingAmount: closing, expectedAmount: expected });
      toast({ title: "Caixa fechado com sucesso!" });
      setShowCloseModal(false);
      setClosingAmount(0);
    } catch {
      toast({ title: "Erro ao fechar caixa", variant: "destructive" });
    }
  };

  const expectedAmount = isOpen ? (currentRegister!.opening_amount || 0) + (cashTotals?.total || 0) : 0;
  const closingNum = closingAmount;
  const diff = closingNum - expectedAmount;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2952FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30 pb-20">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-8 space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-widest text-[#2952FF]">CONTROLE DE CAIXA</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Caixa</h1>
        </header>

        {/* ── Status Section ──────────────────────────────────────────── */}
        {!isOpen ? (
          <div className="py-12 md:py-20 flex flex-col items-center text-center space-y-4 md:space-y-6 bg-[#161618] border border-dashed border-zinc-800 rounded-2xl md:rounded-[40px]">
            <div className="w-20 h-20 bg-zinc-900 rounded-[30px] flex items-center justify-center text-zinc-700">
              <Lock size={40} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-zinc-300">Caixa Fechado</h4>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">Abra o caixa para começar a registrar vendas em dinheiro.</p>
            </div>
            <Btn variant="primary" className="w-full h-11 text-sm font-black uppercase tracking-widest" onClick={() => setShowOpenModal(true)}>
              <Unlock className="w-4 h-4 mr-2" /> Abrir Caixa
            </Btn>
          </div>
        ) : (
          <div className="bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] p-6 md:p-8 space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Caixa Aberto</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Clock size={14} />
                <span>Aberto às {formatTime(currentRegister!.opened_at)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Valor Inicial</p>
                <p className="text-2xl font-black text-white">{formatBRL(currentRegister!.opening_amount)}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Vendas em Dinheiro</p>
                <p className="text-2xl font-black text-white">{cashTotals?.count || 0} vendas</p>
                <p className="text-sm text-zinc-500 font-bold">{formatBRL(cashTotals?.total || 0)}</p>
              </div>
              <div className="bg-[#2952FF]/5 border border-[#2952FF]/20 rounded-2xl p-5">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Esperado em Caixa</p>
                <p className="text-2xl font-black text-[#2952FF]">{formatBRL(expectedAmount)}</p>
              </div>
            </div>

            <Btn variant="destructive" className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-widest bg-red-500/10 text-red-400 hover:bg-red-500/20" onClick={() => { setClosingAmount(0); setShowCloseModal(true); }}>
              <Lock className="w-5 h-5 mr-2" /> Fechar Caixa
            </Btn>
          </div>
        )}

        {/* ── History Section ─────────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <ClipboardList size={18} /> Histórico de Fechamentos
            </h2>
            <div className="space-y-3">
              {history.map((reg) => (
                <HistoryCard
                  key={reg.id}
                  register={reg}
                  expanded={expandedHistoryId === reg.id}
                  onToggle={() => setExpandedHistoryId(expandedHistoryId === reg.id ? null : reg.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Open Modal ────────────────────────────────────────────────── */}
      {showOpenModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-6">
          <div className="bg-[#1C1C1E] w-full max-w-md rounded-[40px] border border-zinc-800 shadow-2xl p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Abrir Caixa</h2>
              <button onClick={() => setShowOpenModal(false)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Valor inicial em caixa (R$)</p>
              <CurrencyInput
                autoFocus
                value={openingAmount}
                onChange={setOpeningAmount}
              />
            </div>
            <Btn variant="primary" className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-widest" onClick={handleOpen} disabled={openRegister.isPending}>
              Confirmar Abertura <ArrowRight className="ml-2 w-5 h-5" />
            </Btn>
          </div>
        </div>
      )}

      {/* ── Close Modal ───────────────────────────────────────────────── */}
      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-6">
          <div className="bg-[#1C1C1E] w-full max-w-lg rounded-[40px] border border-zinc-800 shadow-2xl p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Fechar Caixa</h2>
              <button onClick={() => setShowCloseModal(false)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Summary */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Valor inicial</span>
                <span className="text-zinc-300 font-bold">{formatBRL(currentRegister.opening_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Vendas em dinheiro ({cashTotals?.count || 0})</span>
                <span className="text-zinc-300 font-bold">{formatBRL(cashTotals?.total || 0)}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400 font-bold">Valor esperado</span>
                <span className="text-[#2952FF] font-black text-lg">{formatBRL(expectedAmount)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Valor presente no caixa (R$)</p>
              <CurrencyInput
                autoFocus
                value={closingAmount}
                onChange={setClosingAmount}
              />
            </div>

            {/* Difference preview */}
            {closingAmount > 0 && (
              <div className={`rounded-2xl p-4 border text-center ${
                diff === 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : diff > 0
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-1">
                  {diff === 0 ? "Conferido ✓" : diff > 0 ? "Sobra" : "Quebra"}
                </p>
                <p className="text-xl font-black">
                  {diff === 0 ? "R$ 0,00" : (diff > 0 ? "+" : "") + formatBRL(diff)}
                </p>
              </div>
            )}

            <Btn variant="destructive" className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600" onClick={handleClose} disabled={closeRegister.isPending}>
              Confirmar Fechamento
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Card with expandable sales ──────────────────────────────────────

function ClipboardList(props: any) {
  return <DollarSign {...props} />;
}

function HistoryCard({ register, expanded, onToggle }: { register: any; expanded: boolean; onToggle: () => void }) {
  const { data: salesData } = useCashRegisterSales(expanded ? register.id : null);
  const diff = Number(register.difference) || 0;

  return (
    <div className="bg-[#161618] border border-zinc-800 rounded-[24px] overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full text-left hover:bg-zinc-800/20 transition-colors">
        {/* Mobile Layout: Stacked */}
        <div className="p-4 space-y-3 md:hidden">
          {/* Linha 1: data */}
          <div className="text-sm font-bold text-white">
            {formatDateTime(register.opened_at)}
          </div>
          {/* Linha 2: horário de fechamento + badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {register.closed_at ? `Fechado às ${formatTime(register.closed_at)}` : ""}
            </span>
            {diff === 0 ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={12} /> Conferido
              </span>
            ) : diff < 0 ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle size={12} /> Quebra
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <TrendingUp size={12} /> Sobra
              </span>
            )}
          </div>
          {/* Linha 2: 3 valores empilhados */}
          <div className="flex justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-zinc-500">Inicial</p>
              <p className="text-sm font-bold">{formatBRL(Number(register.opening_amount))}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-zinc-500">Esperado</p>
              <p className="text-sm font-bold">{formatBRL(Number(register.expected_amount) || 0)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-zinc-500">Informado</p>
              <p className="text-sm font-bold">{formatBRL(Number(register.closing_amount) || 0)}</p>
            </div>
          </div>
        </div>

        {/* Desktop Layout: Horizontal */}
        <div className="hidden md:flex items-center justify-between p-6">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-bold text-white">
              {formatDateTime(register.opened_at)}
            </p>
            <p className="text-xs text-zinc-500">
              {register.closed_at ? `Fechado às ${formatTime(register.closed_at)}` : ""}
            </p>
            <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1">
              <span>Inicial: {formatBRL(Number(register.opening_amount))}</span>
              <span>Esperado: {formatBRL(Number(register.expected_amount) || 0)}</span>
              <span>Informado: {formatBRL(Number(register.closing_amount) || 0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {diff === 0 ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={12} /> Conferido
              </span>
            ) : diff < 0 ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle size={12} /> Quebra {formatBRL(Math.abs(diff))}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <TrendingUp size={12} /> Sobra {formatBRL(diff)}
              </span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 p-6 space-y-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Vendas em Dinheiro da Sessão</p>
          {!salesData || salesData.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">Nenhuma venda em dinheiro nesta sessão</p>
          ) : (
            <div className="space-y-2">
              {salesData.map((entry: any) => {
                const sale = entry.sales;
                if (!sale) return null;
                const customer = sale.customers;
                const items = sale.sale_items || [];
                return (
                  <div key={entry.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-zinc-200">
                        {customer?.name || "Sem cliente"} — {formatTime(sale.created_at)}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {items.map((i: any) => `${i.quantity}x ${i.description}`).join(", ")}
                      </p>
                    </div>
                    <p className="text-sm font-black text-white">{formatBRL(Number(entry.amount))}</p>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total</span>
                <span className="text-lg font-black text-white">
                  {formatBRL(salesData.reduce((s: number, e: any) => s + Number(e.amount), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
