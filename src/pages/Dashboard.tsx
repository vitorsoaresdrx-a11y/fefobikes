import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Wrench,
  FileText,
  Package,
  Plus,
  Users,
  BarChart3,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  {
    label: "Registrar Venda",
    description: "Abrir o ponto de venda (PDV)",
    icon: ShoppingCart,
    to: "/pdv",
    primary: true,
  },
  {
    label: "Abrir Orçamento",
    description: "Criar orçamento para cliente",
    icon: FileText,
    to: "/pdv",
    primary: true,
  },
  {
    label: "Nova Manutenção",
    description: "Registrar serviço de manutenção",
    icon: Wrench,
    to: "/pdv",
    primary: true,
  },
  {
    label: "Novo Produto",
    description: "Cadastrar peça ou acessório",
    icon: Plus,
    to: "/produtos",
    primary: false,
  },
  {
    label: "Ver Estoque",
    description: "Consultar estoque atual",
    icon: Package,
    to: "/estoque",
    primary: false,
  },
  {
    label: "Clientes",
    description: "Buscar ou cadastrar cliente",
    icon: Users,
    to: "/clientes",
    primary: false,
  },
  {
    label: "DRE",
    description: "Ver demonstrativo financeiro",
    icon: BarChart3,
    to: "/dre",
    primary: false,
  },
  {
    label: "Gastos",
    description: "Registrar despesa",
    icon: Wallet,
    to: "/gastos",
    primary: false,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Ações Rápidas</h1>
        <p className="text-sm text-muted-foreground mt-1">Atalhos para o dia a dia no atendimento</p>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions
          .filter((a) => a.primary)
          .map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group text-center"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
            </button>
          ))}
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions
          .filter((a) => !a.primary)
          .map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors text-left"
            >
              <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{action.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
