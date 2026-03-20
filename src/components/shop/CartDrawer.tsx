import { useCart } from "@/hooks/useCart";
import { Drawer } from "vaul";
import { ShoppingBag, X, Plus, Minus, Send, Bike } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  const handleCheckout = () => {
    const itemsList = items.map(i => `- ${i.quantity}x ${i.name} (${formatBRL(i.price)})`).join('\n');
    const message = `Olá! Gostaria de encomendar os seguintes itens:\n\n${itemsList}\n\n*Total: ${formatBRL(total)}*`;
    const url = `https://wa.me/5515996128054?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button className="fixed bottom-6 right-6 z-[60] h-16 w-16 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-all group border-4 border-background">
          <ShoppingBag size={24} className="group-hover:rotate-12 transition-transform" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background">
              {items.length}
            </span>
          )}
        </button>
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

            {items.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <ShoppingBag size={64} strokeWidth={1} />
                <p className="text-sm font-black uppercase tracking-widest">Carrinho vazio</p>
                <p className="text-xs font-medium">Adicione itens da loja para continuar.</p>
              </div>
            ) : (
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
            )}
          </div>

          <div className="p-6 md:p-8 bg-secondary/50 border-t border-border space-y-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
              <span className="font-bold">{formatBRL(total)}</span>
            </div>
            <div className="flex items-center justify-between text-white border-t border-border pt-4">
              <span className="text-sm font-black uppercase tracking-[0.2em]">Total</span>
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
