import { useNavigate } from "react-router-dom";
import { ShoppingCart, Wrench, FileText } from "lucide-react";

const actions = [
  {
    label: "Registrar Venda",
    description: "Abrir o ponto de venda (PDV)",
    icon: ShoppingCart,
    to: "/pdv",
  },
  {
    label: "Abrir Orçamento",
    description: "Criar orçamento para cliente",
    icon: FileText,
    to: "/pdv",
  },
  {
    label: "Nova Manutenção",
    description: "Registrar serviço de manutenção",
    icon: Wrench,
    to: "/pdv",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[70vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Ações Rápidas</h1>
        <p className="text-sm text-muted-foreground mt-1">Atalhos para o dia a dia no atendimento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {actions.map((action) => (
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
    </div>
  );
}
