import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Wrench, MessageCircle } from "lucide-react";

const tabs = [
  { label: "Início", path: "/", icon: LayoutDashboard },
  { label: "PDV", path: "/pdv", icon: ShoppingCart },
  { label: "Mecânica", path: "/mecanica", icon: Wrench },
  { label: "WhatsApp", path: "/whatsapp", icon: MessageCircle },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#111113]/80 backdrop-blur-xl border-t border-zinc-800/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-2 h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
            >
              {active && (
                <span className="absolute top-2 w-8 h-0.5 rounded-full bg-[#820AD1]" />
              )}
              <div
                className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all ${
                  active ? "bg-[#820AD1]/15" : ""
                }`}
              >
                <tab.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? "text-[#820AD1]" : "text-zinc-500"}
                />
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${
                  active ? "text-[#820AD1]" : "text-zinc-600"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
