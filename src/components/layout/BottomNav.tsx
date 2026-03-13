import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Wrench, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

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
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border/50"
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
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <tab.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? "text-primary" : "text-muted-foreground"}
                />
              </motion.div>
              <span
                className={`text-[9px] font-bold uppercase tracking-widest ${
                  active ? "text-primary" : "text-muted-foreground/70"
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
