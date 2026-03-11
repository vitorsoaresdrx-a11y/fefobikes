import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
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
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";
import ProdutoPublico from "@/pages/ProdutoPublico";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

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
        <Route path="/" element={<Dashboard />} />
        <Route path="/produtos" element={<Pecas />} />
        <Route path="/bikes" element={<Bikes />} />
        <Route path="/bikes/nova" element={<BikeForm />} />
        <Route path="/bikes/:id" element={<BikeForm />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/pdv" element={<PDV />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/dre" element={<DRE />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
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
