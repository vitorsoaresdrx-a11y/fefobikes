import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
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
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="dark">
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pecas" element={<Pecas />} />
              <Route path="/bikes" element={<Bikes />} />
              <Route path="/bikes/nova" element={<BikeForm />} />
              <Route path="/bikes/:id" element={<BikeForm />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/pdv" element={<PDV />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/dre" element={<DRE />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
