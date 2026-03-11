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
  Landmark,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCashRegister } from "@/hooks/useCashRegister";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Geral",
    items: [
      { title: "Ações Rápidas", url: "/", icon: LayoutDashboard },
      { title: "Dashboard", url: "/dre", icon: BarChart3 },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", url: "/produtos", icon: Wrench },
      { title: "Bikes", url: "/bikes", icon: Bike },
      { title: "Estoque", url: "/estoque", icon: Package },
    ],
  },
  {
    label: "Vendas",
    items: [
      { title: "PDV", url: "/pdv", icon: ShoppingCart },
      { title: "Histórico", url: "/historico", icon: ClipboardList },
    ],
  },
  {
    label: "Operações",
    items: [
      { title: "Mecânica", url: "/mecanica", icon: Wrench },
      { title: "Gastos", url: "/gastos", icon: Wallet },
      { title: "Clientes", url: "/clientes", icon: Users },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ],
  },
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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 px-4 mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="px-2 space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={
                          active
                            ? "!bg-[linear-gradient(to_left,hsl(225_100%_52%/0.15),transparent_70%)] border-r-2 !border-r-[#2952FF]"
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
        ))}

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
