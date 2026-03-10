import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Maps route paths to pt-BR labels */
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/pecas": "Peças",
  "/bikes": "Bikes",
  "/bikes/nova": "Nova Bike",
  "/estoque": "Estoque",
  "/pdv": "PDV",
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

  const pageTitle = crumbs.length > 0
    ? crumbs[crumbs.length - 1].label
    : "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-12 flex items-center gap-3 border-b border-border px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border" />
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

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
