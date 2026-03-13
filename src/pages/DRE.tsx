import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Percent,
  Minus,
  ChevronLeft,
  ChevronRight,
  Activity,
  Target,
} from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useFixedExpenses, useVariableExpenses } from "@/hooks/useExpenses";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TAX_RATE = 0.08;

import { formatBRL } from "@/lib/format";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "ghost",
  size = "icon",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "icon" | "md";
}) => {
  const v = {
    primary: "bg-[#2952FF] text-white hover:bg-[#4A6FFF]",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
  };
  const s = {
    icon: "h-9 w-9 flex items-center justify-center rounded-xl",
    md: "h-10 px-4 py-2 text-sm font-bold rounded-xl",
  };
  return (
    <button
      className={`inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  tag,
  color = "text-white",
  compact = false,
  formatValue = formatBRL,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tag: string;
  color?: string;
  compact?: boolean;
  formatValue?: (v: number) => string;
}) {
  if (compact) {
    return (
      <div className="bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] px-4 py-3 md:p-8 hover:border-zinc-700 transition-all overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-400 shrink-0">
              <Icon size={16} />
            </div>
            <div>
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{tag}</span>
              <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">{title}</p>
            </div>
          </div>
          <span className={`text-base md:text-2xl font-black tracking-tighter shrink-0 ml-3 ${color}`}>{formatValue(value)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] p-3 md:p-8 hover:border-zinc-700 transition-all duration-500 overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.03] text-zinc-600">
        <Icon size={120} className="md:hidden" />
        <Icon size={160} className="hidden md:block" />
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4 md:space-y-10">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-400">
            <Icon size={18} />
          </div>
          <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest">
            {tag}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight mb-0.5 md:mb-1">{title}</p>
          <h2 className={`text-lg md:text-2xl font-black tracking-tighter ${color}`}>{formatValue(value)}</h2>
        </div>
      </div>
    </div>
  );
}

function ChartContainer({
  title,
  subtitle,
  value,
  children,
}: {
  title: string;
  subtitle: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] p-4 md:p-8 space-y-3 md:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5 md:mb-1">{title}</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">{value}</h3>
            <span className="text-[10px] font-bold text-zinc-500 uppercase bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
              {subtitle}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center text-zinc-600">
          <Activity size={16} />
        </div>
      </div>
      {children}
    </div>
  );
}

function DRELineRow({
  label,
  value,
  icon: Icon,
  type,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  type: "header" | "deduction" | "subtotal";
}) {
  const isDeduction = type === "deduction";
  const isSubtotal = type === "subtotal";
  return (
    <div
      className={`flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl transition-colors ${
        isSubtotal ? "bg-zinc-900 border border-zinc-800" : "hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <div
          className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${
            isSubtotal ? "bg-[#2952FF]/10 text-[#2952FF]" : "bg-zinc-900 text-zinc-500"
          }`}
        >
          <Icon size={16} />
        </div>
        <span className={`text-xs md:text-sm font-bold leading-snug min-w-0 ${isSubtotal ? "text-white" : "text-zinc-400"}`}>
          {label}
        </span>
      </div>
      <span
        className={`text-xs md:text-sm font-black tabular-nums text-right shrink-0 ml-2 whitespace-nowrap ${
          isDeduction
            ? "text-red-400/80"
            : isSubtotal
            ? "text-blue-400"
            : "text-zinc-100"
        }`}
      >
        {value < 0 ? `- ${formatBRL(Math.abs(value))}` : formatBRL(value)}
      </span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1C1C1E] border border-zinc-800 p-4 rounded-2xl shadow-2xl">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Dia {label}</p>
      <p className="text-sm font-black text-white">{formatBRL(payload[0].value)}</p>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function DRE() {
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: fixedExpenses = [], isLoading: fixedLoading } = useFixedExpenses();
  const { data: variableExpenses = [], isLoading: varLoading } = useVariableExpenses();
  const isLoading = salesLoading || fixedLoading || varLoading;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const monthlyFixedCost = useMemo(
    () => fixedExpenses.filter((e) => e.active).reduce((s, e) => s + Number(e.amount), 0),
    [fixedExpenses]
  );

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: MONTHS_SHORT[i],
      revenue: 0,
      cardFees: 0,
      variableExpenses: 0,
    }));

    sales.forEach((sale: any) => {
      const date = new Date(sale.created_at);
      if (date.getFullYear() !== selectedYear) return;
      const m = date.getMonth();
      months[m].revenue += Number(sale.total) || 0;
      months[m].cardFees += Number(sale.card_fee) || 0;
    });

    variableExpenses.forEach((exp: any) => {
      const d = new Date(exp.expense_date + "T00:00:00");
      if (d.getFullYear() !== selectedYear) return;
      months[d.getMonth()].variableExpenses += Number(exp.amount) || 0;
    });

    return months.map((m) => ({
      ...m,
      taxes: m.revenue * TAX_RATE,
      fixedExpenses: monthlyFixedCost,
      netProfit:
        m.revenue - m.revenue * TAX_RATE - m.cardFees - monthlyFixedCost - m.variableExpenses,
    }));
  }, [sales, variableExpenses, selectedYear, monthlyFixedCost]);

  const monthsInScope = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;

  const monthlySalesCount = useMemo(() => {
    return sales.filter((sale: any) => {
      const date = new Date(sale.created_at);
      return date.getFullYear() === selectedYear;
    }).length;
  }, [sales, selectedYear]);

  const totals = useMemo(() => {
    const t = monthlyData.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        cardFees: acc.cardFees + m.cardFees,
        taxes: acc.taxes + m.taxes,
        variableExpenses: acc.variableExpenses + m.variableExpenses,
      }),
      { revenue: 0, cardFees: 0, taxes: 0, variableExpenses: 0 }
    );
    const totalFixed = monthlyFixedCost * monthsInScope;
    const netRevenue = t.revenue - t.taxes - t.cardFees;
    const netProfit = netRevenue - totalFixed - t.variableExpenses;
    return { ...t, fixedExpenses: totalFixed, netRevenue, netProfit };
  }, [monthlyData, monthlyFixedCost, monthsInScope]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const dailyChartData = useMemo(() => {
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      revenue: 0,
      netProfit: 0,
    }));

    sales.forEach((sale: any) => {
      const date = new Date(sale.created_at);
      if (date.getFullYear() !== selectedYear || date.getMonth() !== selectedMonth) return;
      const d = date.getDate() - 1;
      const rev = Number(sale.total) || 0;
      const cardFee = Number(sale.card_fee) || 0;
      days[d].revenue += rev;
      days[d].netProfit += rev - rev * TAX_RATE - cardFee;
    });

    const isCurrentMonth =
      selectedYear === currentYear && selectedMonth === new Date().getMonth();
    const limit = isCurrentMonth ? new Date().getDate() : daysInMonth;
    return days.slice(0, limit);
  }, [sales, selectedYear, selectedMonth, daysInMonth, currentYear]);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = selectedYear === currentYear && selectedMonth === new Date().getMonth();
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };
  const isAtCurrentMonth =
    selectedYear === currentYear && selectedMonth === new Date().getMonth();

  const marginPct =
    totals.revenue > 0
      ? ((totals.netProfit / totals.revenue) * 100).toFixed(1)
      : "0.0";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2952FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-3 md:space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#2952FF] rounded-xl md:rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
                <Activity size={16} className="md:hidden text-white" />
                <Activity size={20} className="hidden md:block text-white" />
              </div>
              <span className="text-[10px] md:text-sm font-black tracking-widest text-[#2952FF] uppercase">Performance Hub</span>
            </div>
            <h1 className="text-lg md:text-2xl lg:text-4xl font-black md:font-extrabold tracking-tight">Análise DRE</h1>
          </div>

          <div className="flex items-center bg-[#161618] border border-zinc-800 rounded-xl md:rounded-2xl p-1 h-10 md:h-auto self-start">
            <Btn onClick={() => setSelectedYear((y) => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Btn>
            <span className="text-xs font-black uppercase tracking-widest px-4 md:px-6 min-w-[80px] md:min-w-[100px] text-center">
              {selectedYear}
            </span>
            <Btn
              onClick={() => setSelectedYear((y) => Math.min(y + 1, currentYear))}
              disabled={selectedYear >= currentYear}
            >
              <ChevronRight className="w-4 h-4" />
            </Btn>
          </div>
        </header>

        {/* KPI Cards */}
        {(() => {
          const kpiValues = [totals.revenue, totals.netRevenue, totals.fixedExpenses + totals.variableExpenses, totals.netProfit];
          const hasLargeValue = kpiValues.some((v) => Math.abs(v) >= 100000);
          return (
            <div className={hasLargeValue ? "flex flex-col gap-3 md:grid md:grid-cols-4 md:gap-6" : "grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"}>
              <StatCard title="Faturamento Bruto" value={totals.revenue} icon={DollarSign} tag="Receita" compact={hasLargeValue} />
              <StatCard title="Vendas do Ano" value={monthlySalesCount} icon={Receipt} tag="Qtd" color="text-indigo-400" compact={hasLargeValue} formatValue={(v) => String(v)} />
              <StatCard
                title="Despesas Totais"
                value={totals.fixedExpenses + totals.variableExpenses}
                icon={TrendingDown}
                tag="Saídas"
                color="text-red-400"
                compact={hasLargeValue}
              />
              <StatCard
                title="Lucro Líquido"
                value={totals.netProfit}
                icon={totals.netProfit >= 0 ? TrendingUp : TrendingDown}
                tag="Resultado"
                color={totals.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}
                compact={hasLargeValue}
              />
            </div>
          );
        })()}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
          <ChartContainer
            title="Faturamento Diário"
            subtitle={MONTHS_FULL[selectedMonth]}
            value={formatBRL(dailyChartData.reduce((s, d) => s + d.revenue, 0))}
          >
            <div className="h-40 md:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2952FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2952FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1E" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#52525B", fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2C2C2E" }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2952FF"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#blueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          <ChartContainer
            title="Lucro Líquido Diário"
            subtitle={MONTHS_FULL[selectedMonth]}
            value={formatBRL(dailyChartData.reduce((s, d) => s + d.netProfit, 0))}
          >
            <div className="h-40 md:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1E" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#52525B", fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                    {dailyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </div>

        {/* DRE Detalhado */}
        <div className="bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-4 md:p-8 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base md:text-lg font-black">Demonstrativo Detalhado</h3>
            <div className="flex items-center gap-1 md:gap-2 bg-[#0A0A0B] p-1 rounded-xl border border-zinc-800 self-start">
              <Btn onClick={prevMonth}>
                <ChevronLeft size={16} />
              </Btn>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 md:px-4 min-w-[80px] md:min-w-[100px] text-center">
                {MONTHS_FULL[selectedMonth]}
              </span>
              <Btn onClick={nextMonth} disabled={isAtCurrentMonth}>
                <ChevronRight size={16} />
              </Btn>
            </div>
          </div>

          <div className="p-4 md:p-8 space-y-2">
            <DRELineRow label="Faturamento Bruto" value={totals.revenue} icon={DollarSign} type="header" />
            <DRELineRow label="Impostos sobre Venda (8%)" value={-totals.taxes} icon={Percent} type="deduction" />
            <DRELineRow label="Taxas de Intermediação (Cartão)" value={-totals.cardFees} icon={CreditCard} type="deduction" />

            <div className="py-4">
              <div className="h-px bg-zinc-800/50 w-full" />
            </div>

            <DRELineRow label="Receita Líquida Operacional" value={totals.netRevenue} icon={Target} type="subtotal" />
            <DRELineRow label="Custos Fixos Totais" value={-totals.fixedExpenses} icon={Minus} type="deduction" />
            <DRELineRow label="Custos Variáveis e Insumos" value={-totals.variableExpenses} icon={Minus} type="deduction" />

            {/* Lucro Final */}
            <div className="mt-3 md:mt-6 p-3 md:p-8 bg-[#2952FF]/5 border border-[#2952FF]/20 rounded-2xl md:rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-[#2952FF] rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(41,82,255,0.4)] shrink-0">
                  <TrendingUp size={20} className="md:hidden" />
                  <TrendingUp size={28} className="hidden md:block" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm md:text-xl">Lucro Líquido Final</h4>
                  <p className="text-zinc-500 text-[9px] md:text-xs font-bold uppercase tracking-widest">
                    Resultado do Exercício de {selectedYear}
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className={`text-2xl md:text-3xl font-black tracking-tighter ${totals.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatBRL(totals.netProfit)}
                </p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Margem: {marginPct}%
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
