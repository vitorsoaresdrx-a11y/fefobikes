import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Pecas from "@/pages/Pecas";
import Bikes from "@/pages/Bikes";
import BikeForm from "@/pages/BikeForm";
import PDV from "@/pages/PDV";
import Historico from "@/pages/Historico";
import Clientes from "@/pages/Clientes";
import Configuracoes from "@/pages/Configuracoes";
import Estoque from "@/pages/Estoque";
import DRE from "@/pages/DRE";
import Gastos from "@/pages/Gastos";
import Mecanica from "@/pages/Mecanica";
import Mecanicos from "@/pages/Mecanicos";
import MecanicosHistorico from "@/pages/MecanicosHistorico";
import CashRegister from "@/pages/CashRegister";
import WhatsAppPage from "@/pages/WhatsApp";
import Permissoes from "@/pages/Permissoes";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";
import ProdutoPublico from "@/pages/ProdutoPublico";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function GuardedRoute({ module, children }: { module: string; children: React.ReactNode }) {
  return (
    <PermissionGuard module={module as any}>
      {children}
    </PermissionGuard>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<GuardedRoute module="dashboard"><Dashboard /></GuardedRoute>} />
        <Route path="/produtos" element={<GuardedRoute module="produtos"><Pecas /></GuardedRoute>} />
        <Route path="/bikes" element={<GuardedRoute module="bikes"><Bikes /></GuardedRoute>} />
        <Route path="/bikes/nova" element={<GuardedRoute module="bikes"><BikeForm /></GuardedRoute>} />
        <Route path="/bikes/:id" element={<GuardedRoute module="bikes"><BikeForm /></GuardedRoute>} />
        <Route path="/estoque" element={<GuardedRoute module="estoque"><Estoque /></GuardedRoute>} />
        <Route path="/pdv" element={<GuardedRoute module="pdv"><PDV /></GuardedRoute>} />
        <Route path="/caixa" element={<GuardedRoute module="caixa"><CashRegister /></GuardedRoute>} />
        <Route path="/historico" element={<GuardedRoute module="historico"><Historico /></GuardedRoute>} />
        <Route path="/dre" element={<GuardedRoute module="dre"><DRE /></GuardedRoute>} />
        <Route path="/gastos" element={<GuardedRoute module="gastos"><Gastos /></GuardedRoute>} />
        <Route path="/mecanica" element={<GuardedRoute module="mecanica"><Mecanica /></GuardedRoute>} />
        <Route path="/mecanicos" element={<GuardedRoute module="mecanica"><Mecanicos /></GuardedRoute>} />
        <Route path="/mecanicos/historico" element={<GuardedRoute module="mecanica"><MecanicosHistorico /></GuardedRoute>} />
        <Route path="/clientes" element={<GuardedRoute module="clientes"><Clientes /></GuardedRoute>} />
        <Route path="/configuracoes" element={<GuardedRoute module="configuracoes"><Configuracoes /></GuardedRoute>} />
        <Route path="/whatsapp" element={<GuardedRoute module="whatsapp"><WhatsAppPage /></GuardedRoute>} />
        <Route path="/permissoes" element={<Permissoes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <div className="dark">
            <Routes>
              {/* Public route - no auth */}
              <Route path="/produto/:sku" element={<ProdutoPublico />} />
              <Route path="/*" element={<AuthGate />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
