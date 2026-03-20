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
  ArrowRight,
  TrendingUp,
  Package,
  PlusCircle,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, addItem } = useCart();
  
  // Upsell Logic: Fetch products from complementary categories
  const { data: suggestions } = useQuery({
    queryKey: ["cart_upsell", items.map(i => i.id).join(',')],
    enabled: items.length > 0,
    queryFn: async () => {
      // Simple logic: if has bike, suggest accessories. if has parts, suggest maintenance tools.
      const categories = items.map(i => (i as any).category).filter(Boolean);
      let suggestCats: string[] = ["Acessórios", "Ferramentas", "Vestuário"];
      
      const { data } = await supabase
        .from("parts" as any)
        .select("*")
        .eq("visible_on_storefront", true)
        .in("category", suggestCats)
        .limit(4);
      
      return data || [];
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

  if (items.length === 0) return null;

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4">
          <button className="w-full h-14 bg-emerald-500 rounded-2xl shadow-2xl flex items-center justify-between px-6 text-white active:scale-95 transition-all group border-2 border-background animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-white text-emerald-600 rounded-full flex items-center justify-center text-[8px] font-black">
                  {totalItems}
                </span>
              </div>
              <span className="text-xs font-black uppercase tracking-widest italic">Ver Carrinho</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">{formatBRL(total)}</span>
              <ChevronRight size={16} className="opacity-50" />
            </div>
          </button>
        </div>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[92vh] bg-background border-t border-border rounded-t-[40px] z-[101] outline-none flex flex-col">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted/30 my-4" />
          
          <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                <ShoppingBag className="text-primary" /> Meu Carrinho
              </h2>
              <Drawer.Close className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <X size={20} />
              </Drawer.Close>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-card border border-border/50 rounded-3xl p-4 flex gap-4 items-center group">
                  <div className="h-20 w-20 rounded-2xl overflow-hidden bg-muted/20 shrink-0">
                    {item.image ? (
                      <img src={getOptimizedImageUrl(item.image, 200) || item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Bike size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{item.name}</h3>
                    <p className="text-primary font-black text-sm">{formatBRL(item.price)}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3 bg-background/50 rounded-xl p-1 border border-border/50">
                        <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center text-white"><Minus size={12} /></button>
                        <span className="text-[10px] font-black text-white w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center text-white"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-[10px] font-black text-destructive/50 uppercase tracking-widest hover:text-destructive">Remover</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* UPSELL SECTION */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Complete seu Kit</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                  {suggestions.map((s: any) => (
                    <div key={s.id} className="min-w-[140px] bg-card/30 border border-border/30 rounded-2xl p-3 space-y-2 shrink-0 group">
                      <div className="h-24 rounded-xl overflow-hidden bg-muted/20 relative">
                         {s.images?.[0] ? (
                            <img src={getOptimizedImageUrl(s.images[0], 200) || s.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20"><Package size={20} /></div>
                         )}
                         <button 
                           onClick={() => {
                             addItem(s, s.pix_price || s.sale_price || 0);
                             // import("sonner").then(({ toast }) => toast.success(`${s.name} adicionado!`));
                           }}
                           className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                         >
                           <PlusCircle size={18} />
                         </button>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-white line-clamp-1">{s.name}</p>
                        <p className="text-[10px] font-black text-primary">{formatBRL(s.pix_price || s.sale_price || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 bg-secondary/50 border-t border-border space-y-4">
            <div className="flex items-center justify-between text-muted-foreground border-b border-border/10 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest">Resumo do Pedido</span>
              <span className="text-xs font-black text-white">{totalItems} itens</span>
            </div>
            <div className="flex items-center justify-between text-white pt-2">
              <span className="text-sm font-black uppercase tracking-[0.2em] italic">Total</span>
              <span className="text-2xl font-black text-primary">{formatBRL(total)}</span>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full h-16 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-[32px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] mt-4"
            >
              Finalizar no WhatsApp <Send size={20} />
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
