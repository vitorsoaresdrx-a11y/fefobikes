import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Percent,
  ArrowDown,
  Minus,
  ChevronLeft,
  ChevronRight,
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
} from "recharts";

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const TAX_RATE = 0.08;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatBRL(value);
}

interface DRELine {
  label: string;
  value: number;
  type: "revenue" | "deduction" | "subtotal" | "total";
  icon?: React.ElementType;
}

export default function DRE() {
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: fixedExpenses = [], isLoading: fixedLoading } = useFixedExpenses();
  const { data: variableExpenses = [], isLoading: varLoading } = useVariableExpenses();
  const isLoading = salesLoading || fixedLoading || varLoading;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Monthly fixed cost (sum of active fixed expenses)
  const monthlyFixedCost = useMemo(
    () => fixedExpenses.filter((e) => e.active).reduce((s, e) => s + Number(e.amount), 0),
    [fixedExpenses]
  );

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: MONTHS[i],
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
      netProfit: m.revenue - m.revenue * TAX_RATE - m.cardFees - monthlyFixedCost - m.variableExpenses,
    }));
  }, [sales, variableExpenses, selectedYear, monthlyFixedCost]);

  // Totals for the year
  const monthsInScope = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
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

  // DRE lines
  const dreLines: DRELine[] = [
    { label: "Faturamento Bruto", value: totals.revenue, type: "revenue", icon: DollarSign },
    { label: "(-) Impostos (8%)", value: -totals.taxes, type: "deduction", icon: Percent },
    { label: "(-) Taxas de Cartão", value: -totals.cardFees, type: "deduction", icon: CreditCard },
    { label: "= Receita Líquida", value: totals.netRevenue, type: "subtotal", icon: Receipt },
    { label: "(-) Gastos Fixos", value: -totals.fixedExpenses, type: "deduction", icon: Minus },
    { label: "(-) Gastos Variáveis", value: -totals.variableExpenses, type: "deduction", icon: Minus },
    { label: "(-) Perdas", value: 0, type: "deduction", icon: TrendingDown },
    { label: "= Lucro Líquido", value: totals.netProfit, type: "total", icon: TrendingUp },
  ];

  // Chart data (only months with data or up to current month)
  const chartData = monthlyData.filter(
    (m) => m.month <= (selectedYear === currentYear ? new Date().getMonth() : 11)
  );

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground">
            {entry.name}: <span className="font-medium text-foreground">{formatBRL(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">DRE</h1>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-1">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[48px] text-center">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((y) => Math.min(y + 1, currentYear))}
            disabled={selectedYear >= currentYear}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Cards - row 1 */}
        <KPICard
          label="Faturamento"
          value={formatBRL(totals.revenue)}
          icon={DollarSign}
          accent="primary"
        />
        <KPICard
          label="Impostos (8%)"
          value={formatBRL(totals.taxes)}
          icon={Percent}
          accent="amber"
        />
        <KPICard
          label="Taxas de Cartão"
          value={formatBRL(totals.cardFees)}
          icon={CreditCard}
          accent="rose"
        />
        <KPICard
          label="Lucro Líquido"
          value={formatBRL(totals.netProfit)}
          icon={totals.netProfit >= 0 ? TrendingUp : TrendingDown}
          accent={totals.netProfit >= 0 ? "emerald" : "destructive"}
        />

        {/* Revenue Chart - spans 2 cols */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Faturamento Mensal
              </p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {formatBRL(totals.revenue)}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(225, 100%, 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(225, 100%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 12%)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(v)}
                  width={60}
                />
                <Tooltip content={customTooltip} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Faturamento"
                  stroke="hsl(225, 100%, 60%)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Chart - spans 2 cols */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Lucro Líquido Mensal
              </p>
              <p className={`text-xl font-semibold mt-1 ${totals.netProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {formatBRL(totals.netProfit)}
              </p>
            </div>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              totals.netProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"
            }`}>
              {totals.netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 12%)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(v)}
                  width={60}
                />
                <Tooltip content={customTooltip} />
                <Bar
                  dataKey="netProfit"
                  name="Lucro Líquido"
                  radius={[4, 4, 0, 0]}
                  fill="hsl(152, 76%, 40%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full DRE Statement - spans all 4 cols */}
        <div className="md:col-span-2 lg:col-span-4 bg-card border border-border rounded-xl p-5">
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">
            Demonstração do Resultado — {selectedYear}
          </h2>
          <div className="space-y-1">
            {dreLines.map((line, i) => {
              const Icon = line.icon;
              const isSubtotal = line.type === "subtotal";
              const isTotal = line.type === "total";
              const isDeduction = line.type === "deduction";

              return (
                <div key={i}>
                  {(isSubtotal || isTotal) && (
                    <div className="border-t border-border my-2" />
                  )}
                  <div
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                      isTotal
                        ? "bg-primary/5 border border-primary/20"
                        : isSubtotal
                        ? "bg-muted/30"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div
                          className={`h-7 w-7 rounded-md flex items-center justify-center ${
                            isTotal
                              ? line.value >= 0
                                ? "bg-emerald-500/10"
                                : "bg-destructive/10"
                              : isSubtotal
                              ? "bg-primary/10"
                              : isDeduction
                              ? "bg-muted/50"
                              : "bg-primary/10"
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${
                              isTotal
                                ? line.value >= 0
                                  ? "text-emerald-500"
                                  : "text-destructive"
                                : isSubtotal
                                ? "text-primary"
                                : isDeduction
                                ? "text-muted-foreground"
                                : "text-primary"
                            }`}
                          />
                        </div>
                      )}
                      <span
                        className={`text-sm ${
                          isTotal || isSubtotal
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {line.label}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-mono tabular-nums ${
                        isTotal
                          ? line.value >= 0
                            ? "text-emerald-500 font-bold text-base"
                            : "text-destructive font-bold text-base"
                          : isSubtotal
                          ? "font-semibold text-foreground"
                          : line.value < 0
                          ? "text-destructive/80"
                          : line.value === 0
                          ? "text-muted-foreground/40"
                          : "text-foreground"
                      }`}
                    >
                      {line.value === 0 && line.type === "deduction"
                        ? "—"
                        : formatBRL(Math.abs(line.value))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── KPI Card ─── */
function KPICard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-500" },
    destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  };
  const c = colorMap[accent] || colorMap.primary;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </p>
        <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${c.text}`} />
        </div>
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
