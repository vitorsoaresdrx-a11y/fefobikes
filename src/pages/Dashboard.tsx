import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Wrench,
  FileText,
  Plus,
  Clock,
  UserPlus,
  Package,
  TrendingUp,
  Monitor,
  Activity,
  ChevronRight,
} from "lucide-react";

// ─── Data (do original) ───────────────────────────────────────────────────────
const primaryActions = [
  {
    label: "Registrar Venda",
    description: "Lançamento imediato de produtos e bikes no PDV.",
    icon: ShoppingCart,
    to: "/pdv",
    color: "primary" as const,
  },
  {
    label: "Novo Orçamento",
    description: "Crie uma proposta detalhada para o cliente revisar.",
    icon: FileText,
    to: "/pdv",
    color: "indigo" as const,
  },
  {
    label: "Manutenção",
    description: "Abertura de ordem de serviço e check-up técnico.",
    icon: Wrench,
    to: "/pdv",
    color: "amber" as const,
  },
];

const secondaryActions = [
  { icon: <UserPlus size={18} />, label: "Cadastrar Cliente", to: "/clientes" },
  { icon: <Package size={18} />, label: "Checar Estoque", to: "/estoque" },
  { icon: <TrendingUp size={18} />, label: "Ver Vendas Hoje", to: "/vendas" },
  { icon: <Monitor size={18} />, label: "Site Público", to: "/site" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
type ColorTheme = "primary" | "amber" | "indigo";

const themes: Record<ColorTheme, string> = {
  primary: "border-[#2952FF]/20 hover:border-[#2952FF]/50",
  amber:   "border-amber-500/20 hover:border-amber-500/50",
  indigo:  "border-indigo-500/20 hover:border-indigo-500/50",
};

const iconColors: Record<ColorTheme, string> = {
  primary: "text-[#2952FF] bg-[#2952FF]/10",
  amber:   "text-amber-500 bg-amber-500/10",
  indigo:  "text-indigo-400 bg-indigo-400/10",
};

const hoverBg: Record<ColorTheme, string> = {
  primary: "hover:bg-[#2952FF]/5",
  amber:   "hover:bg-amber-500/5",
  indigo:  "hover:bg-indigo-500/5",
};

const actionTextColor: Record<ColorTheme, string> = {
  primary: "text-[#2952FF]",
  amber:   "text-amber-500",
  indigo:  "text-indigo-400",
};

const QuickActionCard = ({
  label,
  description,
  icon: Icon,
  onClick,
  color = "primary",
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: ColorTheme;
}) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-start gap-6 p-8 rounded-[40px] bg-[#161618] border transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:-translate-y-2 text-left overflow-hidden ${themes[color]} ${hoverBg[color]}`}
  >
    {/* Background ghost icon */}
    <div className="absolute -right-6 -bottom-6 opacity-[0.03] text-zinc-600 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12">
      <Icon size={180} />
    </div>

    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${iconColors[color]}`}>
      <Icon size={28} className="stroke-[2.5]" />
    </div>

    <div className="space-y-2 relative z-10">
      <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">{label}</h3>
      <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-[200px]">{description}</p>
    </div>

    <div className={`mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 ${actionTextColor[color]}`}>
      Iniciar Agora <ChevronRight size={12} />
    </div>
  </button>
);

const SecondaryAction = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-5 bg-[#161618] border border-zinc-800 rounded-2xl hover:border-[#2952FF]/50 hover:bg-[#2952FF]/5 transition-all text-left group"
  >
    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-[#2952FF] transition-colors">
      {icon}
    </div>
    <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider transition-colors">
      {label}
    </span>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 selection:bg-[#820AD1]/30">

      {/* Topbar */}
      <div className="px-12 py-6 border-b border-zinc-800/50 flex items-center justify-between bg-[#0A0A0B]/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#820AD1] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(130,10,209,0.3)]">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">
              Terminal de Balcão
            </p>
            <h2 className="text-sm font-bold text-white uppercase italic">Fefo Bikes Hub</h2>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">
              Status do Sistema
            </p>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-500 uppercase italic">Online</span>
            </div>
          </div>
          <div className="h-10 w-px bg-zinc-800" />
          <div className="flex items-center gap-4">
            <Clock size={20} className="text-zinc-500" />
            <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-12 space-y-12">

        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white tracking-tighter leading-none italic uppercase">
            O que vamos <span className="text-[#820AD1]">resolver</span> hoje?
          </h1>
          <p className="text-zinc-500 text-lg font-medium">
            Selecione uma ação rápida para iniciar o atendimento.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {primaryActions.map((action) => (
            <QuickActionCard
              key={action.label}
              label={action.label}
              description={action.description}
              icon={action.icon}
              onClick={() => navigate(action.to)}
              color={action.color}
            />
          ))}
        </div>

        {/* Secondary Actions */}
        <div className="pt-12 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 mb-8">
            <Plus size={16} className="text-[#820AD1]" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Outros Procedimentos
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {secondaryActions.map((action) => (
              <SecondaryAction
                key={action.label}
                icon={action.icon}
                label={action.label}
                onClick={() => navigate(action.to)}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-8 left-12 opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">
          Precision Dashboard v2.0 // Fefo Bikes
        </p>
      </footer>
    </div>
  );
}
