import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, ShoppingCart, Wrench, MessageCircle } from "lucide-react";

const items = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "PDV", url: "/pdv", icon: ShoppingCart },
  { title: "Mecânica", url: "/mecanica", icon: Wrench },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
];

export function BottomNav() {
  const location = useLocation();
  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0A0A0B]/95 backdrop-blur-xl border-t border-zinc-800/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                active ? "text-[#2952FF]" : "text-zinc-500"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
