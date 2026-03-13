import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { PageTransition } from "@/components/PageTransition";
import PageSkeleton from "@/components/PageSkeleton";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";
import { useSyncOfflineQueue } from "@/hooks/useSyncOfflineQueue";

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

function OfflineSync() {
  useSyncOfflineQueue();
  return null;
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
    <>
    <OfflineSync />
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<GuardedRoute module="dashboard"><PageTransition><Dashboard /></PageTransition></GuardedRoute>} />
        <Route path="/produtos" element={<GuardedRoute module="produtos"><PageTransition><Pecas /></PageTransition></GuardedRoute>} />
        <Route path="/bikes" element={<GuardedRoute module="bikes"><PageTransition><Bikes /></PageTransition></GuardedRoute>} />
        <Route path="/bikes/nova" element={<GuardedRoute module="bikes"><PageTransition><BikeForm /></PageTransition></GuardedRoute>} />
        <Route path="/bikes/:id" element={<GuardedRoute module="bikes"><PageTransition><BikeForm /></PageTransition></GuardedRoute>} />
        <Route path="/estoque" element={<GuardedRoute module="estoque"><PageTransition><Estoque /></PageTransition></GuardedRoute>} />
        <Route path="/pdv" element={<GuardedRoute module="pdv"><PageTransition><PDV /></PageTransition></GuardedRoute>} />
        <Route path="/caixa" element={<GuardedRoute module="caixa"><PageTransition><CashRegister /></PageTransition></GuardedRoute>} />
        <Route path="/historico" element={<GuardedRoute module="historico"><PageTransition><Historico /></PageTransition></GuardedRoute>} />
        <Route path="/dre" element={<GuardedRoute module="dre"><PageTransition><DRE /></PageTransition></GuardedRoute>} />
        <Route path="/gastos" element={<GuardedRoute module="gastos"><PageTransition><Gastos /></PageTransition></GuardedRoute>} />
        <Route path="/mecanica" element={<GuardedRoute module="mecanica"><PageTransition><Mecanica /></PageTransition></GuardedRoute>} />
        <Route path="/mecanicos" element={<GuardedRoute module="mecanica"><PageTransition><Mecanicos /></PageTransition></GuardedRoute>} />
        <Route path="/mecanicos/historico" element={<GuardedRoute module="mecanica"><PageTransition><MecanicosHistorico /></PageTransition></GuardedRoute>} />
        <Route path="/clientes" element={<GuardedRoute module="clientes"><PageTransition><Clientes /></PageTransition></GuardedRoute>} />
        <Route path="/clientes/:id" element={<GuardedRoute module="clientes"><PageTransition><ClienteDetalhe /></PageTransition></GuardedRoute>} />
        <Route path="/orcamentos" element={<GuardedRoute module="mecanica"><PageTransition><Orcamentos /></PageTransition></GuardedRoute>} />
        <Route path="/configuracoes" element={<GuardedRoute module="configuracoes"><PageTransition><Configuracoes /></PageTransition></GuardedRoute>} />
        <Route path="/whatsapp" element={<GuardedRoute module="whatsapp"><PageTransition><WhatsAppPage /></PageTransition></GuardedRoute>} />
        <Route path="/permissoes" element={<GuardedRoute module="configuracoes"><PageTransition><Permissoes /></PageTransition></GuardedRoute>} />
      </Route>
      <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
    </Routes>
    </>
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
