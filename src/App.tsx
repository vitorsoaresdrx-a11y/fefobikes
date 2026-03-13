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

// Retry dynamic imports once on failure (handles stale chunk hashes after deploys)
function lazyRetry(factory: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    factory().catch(() => {
      // Force reload to get fresh chunk manifest
      window.location.reload();
      return factory();
    })
  );
}

const Dashboard = lazyRetry(() => import("@/pages/Dashboard"));
const Pecas = lazyRetry(() => import("@/pages/Pecas"));
const Bikes = lazyRetry(() => import("@/pages/Bikes"));
const BikeForm = lazyRetry(() => import("@/pages/BikeForm"));
const PDV = lazyRetry(() => import("@/pages/PDV"));
const Historico = lazyRetry(() => import("@/pages/Historico"));
const Clientes = lazyRetry(() => import("@/pages/Clientes"));
const Configuracoes = lazyRetry(() => import("@/pages/Configuracoes"));
const Estoque = lazyRetry(() => import("@/pages/Estoque"));
const DRE = lazyRetry(() => import("@/pages/DRE"));
const Gastos = lazyRetry(() => import("@/pages/Gastos"));
const Mecanica = lazyRetry(() => import("@/pages/Mecanica"));
const Mecanicos = lazyRetry(() => import("@/pages/Mecanicos"));
const MecanicosHistorico = lazyRetry(() => import("@/pages/MecanicosHistorico"));
const CashRegister = lazyRetry(() => import("@/pages/CashRegister"));
const WhatsAppPage = lazyRetry(() => import("@/pages/WhatsApp"));
const Permissoes = lazyRetry(() => import("@/pages/Permissoes"));
const Placeholder = lazyRetry(() => import("@/pages/Placeholder"));
const NotFound = lazyRetry(() => import("@/pages/NotFound"));
const Orcamentos = lazyRetry(() => import("@/pages/Orcamentos"));
const ProdutoPublico = lazyRetry(() => import("@/pages/ProdutoPublico"));
const ClienteDetalhe = lazyRetry(() => import("@/pages/ClienteDetalhe"));
const Jogar = lazyRetry(() => import("@/pages/Jogar"));
const Chamadas = lazyRetry(() => import("@/pages/Chamadas"));
const Contas = lazyRetry(() => import("@/pages/Contas"));

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
        <Route path="/chamadas" element={<PageTransition><Chamadas /></PageTransition>} />
        <Route path="/contas" element={<GuardedRoute module="gastos"><PageTransition><Contas /></PageTransition></GuardedRoute>} />
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
            <Route path="/jogar" element={<Jogar />} />
          </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
