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
  MessageCircle,
  Shield,
  HardHat,
  History,
  FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCashRegister } from "@/hooks/useCashRegister";
import { useTotalUnread } from "@/hooks/useWhatsApp";
import { useMyPermissions, type AppModule, NAV_MODULE_MAP } from "@/hooks/usePermissions";
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
      { title: "Caixa", url: "/caixa", icon: Landmark },
      { title: "Histórico", url: "/historico", icon: ClipboardList },
    ],
  },
  {
    label: "Operações",
    items: [
      { title: "Mecânica", url: "/mecanica", icon: Wrench },
      { title: "Mecânicos", url: "/mecanicos", icon: HardHat },
      { title: "Histórico Mecânicos", url: "/mecanicos/historico", icon: History },
      { title: "Orçamentos", url: "/orcamentos", icon: FileText },
      { title: "Gastos", url: "/gastos", icon: Wallet },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Permissões", url: "/permissoes", icon: Shield },
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentRegister } = useCurrentCashRegister();
  const isCashOpen = currentRegister?.status === "open";
  const { data: totalUnread = 0 } = useTotalUnread();
  const { data: permsData } = useMyPermissions();

  const isOwner = permsData?.isOwner ?? true;
  const permissions = permsData?.permissions ?? [];

  // Close mobile sidebar on route change
  React.useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname]);

  const canAccessModule = (url: string): boolean => {
    if (isOwner) return true;
    const moduleKey = NAV_MODULE_MAP[url] as AppModule | undefined;
    if (!moduleKey) return true;
    if (url === "/permissoes") return false;
    const perm = permissions.find((p) => p.module === moduleKey);
    return perm?.can_access ?? false;
  };

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const handleNavClick = (path: string) => {
    setOpenMobile(false);
    navigate(path);
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
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessModule(item.url));
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 px-4 mb-1">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="px-2 space-y-0.5">
                  {visibleItems.map((item) => {
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
                          <button
                            onClick={() => handleNavClick(item.url)}
                            className="flex items-center gap-2 w-full"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                               <span className="flex items-center gap-2">
                                {item.title}
                                {item.title === "Caixa" && isCashOpen && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                  </span>
                                )}
                                {item.title === "WhatsApp" && totalUnread > 0 && (
                                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                    {totalUnread}
                                  </span>
                                )}
                              </span>
                            )}
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

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
