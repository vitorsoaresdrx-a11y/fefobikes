import {
  LayoutDashboard,
  Wrench,
  Bike,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Settings,
  BarChart3,
  Wallet,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Ações Rápidas", url: "/", icon: LayoutDashboard },
  { title: "Produtos", url: "/produtos", icon: Wrench },
  { title: "Bikes", url: "/bikes", icon: Bike },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "PDV", url: "/pdv", icon: ShoppingCart },
  { title: "Histórico", url: "/historico", icon: ClipboardList },
  { title: "DRE", url: "/dre", icon: BarChart3 },
  { title: "Gastos", url: "/gastos", icon: Wallet },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 py-5">
        <div className="flex items-center gap-2">
          <Bike className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight text-foreground">
              Fefo Bikes
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "!bg-[linear-gradient(to_left,hsl(225_100%_60%/0.12),transparent_70%)] border-r-2 !border-r-primary"
                          : "text-sidebar-foreground/40 hover:text-sidebar-foreground/80"
                      }
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <SidebarGroup className="mt-auto pb-4">
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sair"
                  className="text-sidebar-foreground/40 hover:text-destructive"
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
