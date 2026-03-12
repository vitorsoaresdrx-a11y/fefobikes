import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import PageSkeleton from "@/components/PageSkeleton";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pecas = lazy(() => import("@/pages/Pecas"));
const Bikes = lazy(() => import("@/pages/Bikes"));
const BikeForm = lazy(() => import("@/pages/BikeForm"));
const PDV = lazy(() => import("@/pages/PDV"));
const Historico = lazy(() => import("@/pages/Historico"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const Estoque = lazy(() => import("@/pages/Estoque"));
const DRE = lazy(() => import("@/pages/DRE"));
const Gastos = lazy(() => import("@/pages/Gastos"));
const Mecanica = lazy(() => import("@/pages/Mecanica"));
const Mecanicos = lazy(() => import("@/pages/Mecanicos"));
const MecanicosHistorico = lazy(() => import("@/pages/MecanicosHistorico"));
const CashRegister = lazy(() => import("@/pages/CashRegister"));
const WhatsAppPage = lazy(() => import("@/pages/WhatsApp"));
const Permissoes = lazy(() => import("@/pages/Permissoes"));
const Placeholder = lazy(() => import("@/pages/Placeholder"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Orcamentos = lazy(() => import("@/pages/Orcamentos"));
const ProdutoPublico = lazy(() => import("@/pages/ProdutoPublico"));
const ClienteDetalhe = lazy(() => import("@/pages/ClienteDetalhe"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

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
    <Suspense fallback={<PageSkeleton />}>
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
          <Route path="/clientes/:id" element={<GuardedRoute module="clientes"><ClienteDetalhe /></GuardedRoute>} />
          <Route path="/orcamentos" element={<GuardedRoute module="mecanica"><Orcamentos /></GuardedRoute>} />
          <Route path="/configuracoes" element={<GuardedRoute module="configuracoes"><Configuracoes /></GuardedRoute>} />
          <Route path="/whatsapp" element={<GuardedRoute module="whatsapp"><WhatsAppPage /></GuardedRoute>} />
          <Route path="/permissoes" element={<Permissoes />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
              <Route path="/produto/:sku" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ProdutoPublico />
                </Suspense>
              } />
              <Route path="/*" element={<AuthGate />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
