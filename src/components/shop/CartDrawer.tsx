import { useCart } from "@/hooks/useCart";
import { Drawer } from "vaul";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Send,
  Bike,
  ChevronRight,
  TrendingUp,
  Package,
  PlusCircle,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { ShippingSimulator } from "./ShippingSimulator";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, addItem } = useCart();
  const [addedItems, setAddedItems] = useState<string[]>([]);

  // Upsell Logic: Fetch products from complementary categories
  const { data: suggestions } = useQuery({
    queryKey: ["cart_upsell", items.map(i => i.id).join(',')],
    enabled: items.length > 0,
    queryFn: async () => {
      const suggestCats = ["Acessórios", "Ferramentas", "Vestuário"];

      const { data } = await supabase
        .from("parts" as any)
        .select("*")
        .eq("visible_on_storefront", true)
        .in("category", suggestCats)
        .limit(8);

      // Filter out items already in cart
      const cartIds = items.map(i => i.id);
      return (data || []).filter((s: any) => !cartIds.includes(s.id));
    }
  });

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  const handleCheckout = () => {
    const itemsList = items.map(i => `- ${i.quantity}x ${i.name} (${formatBRL(i.price)})`).join('\n');
    const message = `Olá! Gostaria de encomendar os seguintes itens:\n\n${itemsList}\n\n*Total: ${formatBRL(total)}*`;
    const url = `https://wa.me/5515996128054?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleAddSuggestion = (s: any) => {
    const price = s.pix_price || s.sale_price || s.price_ecommerce || 0;
    addItem(s, price);
    setAddedItems(prev => [...prev, s.id]);
    toast.success(`${s.name} adicionado ao carrinho!`, {
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
    });

    // Clear feedback after 2s
    setTimeout(() => {
      setAddedItems(prev => prev.filter(id => id !== s.id));
    }, 2000);
  };

  if (items.length === 0) return null;

  return (
    <Drawer.Root direction="bottom">
      <Drawer.Trigger asChild>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
        >
          <button
            className="w-full h-14 bg-[#EFFF00] rounded-2xl shadow-[0_20px_50px_rgba(239,255,0,0.3)] flex items-center justify-between px-6 text-black active:scale-[0.98] transition-all group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#EFFF00]/50 border border-transparent hover:border-black/10 relative overflow-hidden"
            aria-label={`Carrinho com ${totalItems} itens, Total de ${formatBRL(total)}`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <ShoppingBag size={22} className="group-hover:scale-110 transition-transform duration-300" />
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1.5 -right-2 h-[18px] min-w-[18px] px-1 bg-black text-[#EFFF00] rounded-full flex items-center justify-center text-[10px] font-bold"
                >
                  {totalItems}
                </motion.span>
              </div>
              <span className="text-sm font-bold tracking-tight">Meu Carrinho</span>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-[16px] font-black">{formatBRL(total)}</span>
              <ChevronRight size={18} className="opacity-40 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
          </button>
        </motion.div>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100]" />

        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[92vh] flex flex-col bg-[#080808] rounded-t-[32px] border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.5)] z-[101] font-['Plus_Jakarta_Sans'] text-white focus-visible:outline-none focus:outline-none overflow-hidden">
          {/* Decorative Drag Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20 my-4" />

          <div className="px-6 md:px-8 pb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2 bg-[#EFFF00]/10 rounded-xl">
                <ShoppingBag size={22} className="text-[#EFFF00]" />
              </div>
              Carrinho
            </h2>
            <Drawer.Close
              className="h-11 w-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00] border border-white/5"
              aria-label="Fechar"
            >
              <X size={22} />
            </Drawer.Close>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-10">

            <div className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((item, index) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
                    className="group relative bg-[#111111] border border-white/5 rounded-3xl p-4 flex gap-4 items-center hover:bg-[#151515] hover:border-white/10 transition-all"
                  >
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden bg-black shrink-0 border border-white/5 p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {item.image ? (
                        <img
                          src={getOptimizedImageUrl(item.image, 200) || item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-white/10">
                          <Bike size={32} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between self-stretch py-1">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white/90 leading-tight line-clamp-1">{item.name}</h3>
                        <p className="text-[#EFFF00] font-black text-lg mt-0.5">{formatBRL(item.price)}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 bg-black rounded-xl p-1 border border-white/5 shadow-inner">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00]"
                            aria-label="Remover um"
                          >
                            <Minus size={14} />
                          </motion.button>
                          <span className="text-sm font-black text-white w-7 text-center select-none" aria-live="polite">
                            {item.quantity}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00]"
                            aria-label="Adicionar um"
                          >
                            <Plus size={14} />
                          </motion.button>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => removeItem(item.id)}
                          className="h-9 w-9 flex items-center justify-center text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label="Remover item"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* FRETE CALCULATOR */}
            <div className="pt-2">
              <ShippingSimulator
                invoiceValue={total}
                productType={items.some((i) => i.price > 1000) ? "bike" : "part"}
              />
            </div>

            {/* UPSELL SECTION */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#EFFF00]" />
                    <span className="text-sm font-black tracking-tight text-white uppercase opacity-40">Complete seu setup</span>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 md:-mx-8 md:px-8">
                  {suggestions.map((s: any, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (idx * 0.05) }}
                      className="min-w-[160px] bg-[#111111] border border-white/5 rounded-3xl p-3 flex flex-col gap-3 group shrink-0 relative overflow-hidden hover:bg-[#151515] hover:border-white/10 transition-all"
                    >
                      <div className="h-32 rounded-2xl overflow-hidden bg-black p-4 relative flex items-center justify-center transition-transform group-hover:scale-[1.02]">
                        {s.images?.[0] ? (
                          <img
                            src={getOptimizedImageUrl(s.images[0], 200) || s.images[0]}
                            className="w-full h-full object-contain"
                            alt={s.name}
                          />
                        ) : (
                          <div className="text-white/10"><Package size={28} /></div>
                        )}

                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddSuggestion(s)}
                          className={`absolute bottom-2 right-2 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00] ${addedItems.includes(s.id)
                              ? "bg-green-500 text-white"
                              : "bg-[#EFFF00] text-black hover:bg-white"
                            }`}
                          aria-label="Adicionar sugestão"
                        >
                          {addedItems.includes(s.id) ? <CheckCircle2 size={20} /> : <PlusCircle size={20} />}
                        </motion.button>
                      </div>
                      <div className="px-1 space-y-1">
                        <p className="text-[13px] font-bold text-white/80 line-clamp-2 leading-tight min-h-[2rem]">{s.name}</p>
                        <p className="text-[15px] font-black text-[#EFFF00]">{formatBRL(s.pix_price || s.sale_price || s.price_ecommerce || 0)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TOTAL & FOOTER */}
          <div className="p-8 pb-10 bg-[#0C0C0C] border-t border-white/10 space-y-6 relative">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#EFFF00]/50 to-transparent" />

            <div className="space-y-3">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-sm font-bold uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-bold">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
              </div>

              <div className="flex items-center justify-between text-white">
                <span className="text-lg font-bold">Total Final</span>
                <div className="text-right">
                  <motion.span
                    key={total}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-black tracking-tighter text-[#EFFF00]"
                  >
                    {formatBRL(total)}
                  </motion.span>
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full h-16 mt-4 bg-[#EFFF00] hover:bg-white disabled:bg-white/5 disabled:text-white/20 text-black rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(239,255,0,0.2)] transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white relative group overflow-hidden"
            >
              <span className="relative z-10">Finalizar no WhatsApp</span>
              <Send size={20} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />

              {/* Animated highlight */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </motion.button>

            <p className="text-[10px] text-center text-white/30 font-bold uppercase tracking-[0.2em]">
              Seus itens serão reservados após o contato
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
