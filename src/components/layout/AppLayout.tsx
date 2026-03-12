import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Maps route paths to pt-BR labels */
const routeLabels: Record<string, string> = {
  "/": "Ações Rápidas",
  "/produtos": "Produtos",
  "/bikes": "Bikes",
  "/bikes/nova": "Nova Bike",
  "/estoque": "Estoque",
  "/pdv": "PDV",
  "/historico": "Histórico",
  "/dre": "DRE",
  "/gastos": "Gastos",
  "/mecanica": "Mecânica",
  "/clientes": "Clientes",
  "/configuracoes": "Configurações",
};

export function AppLayout() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "";
  for (const seg of pathSegments) {
    currentPath += `/${seg}`;
    const label = routeLabels[currentPath] || seg;
    crumbs.push({ label, path: currentPath });
  }

  return (
    <SidebarProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top bar */}
          <header className="h-12 flex items-center gap-3 border-b border-border px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border hidden lg:block" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground text-xs">
                    Fefo Bikes
                  </BreadcrumbPage>
                </BreadcrumbItem>
                {crumbs.map((crumb, i) => (
                  <span key={crumb.path} className="contents">
                    <BreadcrumbSeparator className="text-muted-foreground/50" />
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        className={
                          i === crumbs.length - 1
                            ? "text-foreground text-xs font-medium"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {crumb.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          {/* Main content - pb for bottom nav on mobile */}
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6 pb-20 lg:pb-6">
            <Outlet />
          </main>
        </div>

        {/* Bottom nav for mobile */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
