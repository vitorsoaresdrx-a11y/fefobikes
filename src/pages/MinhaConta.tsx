import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  History, 
  Bike, 
  Package, 
  Wrench, 
  MessageCircle, 
  Search,
  ArrowLeft,
  Loader2,
  Lock,
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/format";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";

export default function MinhaConta() {
  const [identifier, setIdentifier] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // Search logic
  const { data: customerData, isLoading, refetch } = useQuery({
    queryKey: ["customer_history", identifier],
    enabled: false,
    queryFn: async () => {
      const cleanId = identifier.replace(/\D/g, "");
      
      // 1. Find Customer
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .or(`whatsapp.ilike.%${cleanId.slice(-8)}%,cpf.eq.${cleanId}`)
        .maybeSingle();

      if (!customer) return null;

      // 2. Find Service Orders
      const { data: orders } = await supabase
        .from("service_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      // 3. Find Sales
      const { data: sales } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      return { customer, orders, sales };
    }
  });

  const handleSearch = () => {
    if (identifier.length < 8) return;
    setIsSearching(true);
    refetch().then(() => {
      setIsSearching(false);
      setSearchDone(true);
    });
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="p-6 border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/loja" className="p-2 -ml-2 rounded-xl hover:bg-muted text-muted-foreground transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Acesso do Cliente</span>
            <h1 className="text-sm font-black text-white italic uppercase tracking-tighter">Fefo Bikes</h1>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-10">
        {!searchDone ? (
          <div className="py-12 md:py-20 space-y-8 text-center animate-in fade-in slide-in-from-bottom-5">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
              <Lock size={40} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white italic uppercase">Minha Garagem</h2>
              <p className="text-muted-foreground font-medium text-sm">Acesse seu histórico de manutenções e compras usando seu WhatsApp ou CPF.</p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text"
                  placeholder="Seu WhatsApp ou CPF"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full h-16 bg-card border border-border rounded-2xl pl-12 pr-6 text-base font-bold text-white outline-none focus:border-primary transition-all placeholder:text-muted-foreground/30 shadow-2xl shadow-black/20"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={identifier.length < 8 || isSearching}
                className="w-full h-16 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : <>Entrar <Search size={20} /></>}
              </button>
            </div>
            
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] pt-10">Sua privacidade é nossa prioridade</p>
          </div>
        ) : !customerData ? (
          <div className="py-20 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <Lock size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-white">Oops! Não encontramos nada.</p>
              <p className="text-muted-foreground text-sm">Verifique se o número ou CPF está correto ou fale conosco se for seu primeiro acesso.</p>
            </div>
            <button 
              onClick={() => setSearchDone(false)}
              className="text-primary font-black uppercase text-xs tracking-widest hover:underline"
            >
              Tentar outro número
            </button>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            {/* User Greeting */}
            <div className="bg-card border border-border rounded-[40px] p-8 md:p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                    <User size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Eae, {customerData.customer.name.split(' ')[0]}!</h2>
                    <p className="text-muted-foreground text-sm font-medium">Bem-vindo à sua garagem particular.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Service History - GARAGEM */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                  <Wrench className="text-primary" /> Minha Garagem
                </h3>
                <span className="bg-card border border-border px-3 py-1 rounded-full text-[10px] font-black text-muted-foreground uppercase">{customerData.orders?.length || 0} Atendimentos</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerData.orders?.map((order: any) => (
                  <div key={order.id} className="bg-card/50 border border-border rounded-[32px] p-6 hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Calendar size={12} /> {formatDate(order.created_at)}
                      </div>
                      <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        order.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {order.status === 'completed' ? 'Concluído' : 'Em Manutenção'}
                      </div>
                    </div>
                    
                    <h4 className="text-base font-black text-white uppercase mb-1">{order.bike_name || "Bicicleta"}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed italic">{order.problem}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="text-[10px] font-bold text-muted-foreground">
                        VALOR: <span className="text-white font-black">{formatBRL(order.price)}</span>
                      </div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <User size={10} strokeWidth={3} /> {order.mechanic_name || "Fefo Gears"}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!customerData.orders || customerData.orders.length === 0) && (
                  <div className="col-span-full py-10 bg-muted/5 border border-border/50 border-dashed rounded-[32px] text-center space-y-3">
                     <Bike className="mx-auto opacity-20" size={32} />
                     <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhuma bike na garagem ainda.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Shopping History */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                  <Package className="text-primary" /> Histórico de Compras
                </h3>
              </div>

              <div className="space-y-4">
                {customerData.sales?.map((sale: any) => (
                  <div key={sale.id} className="bg-card/50 border border-border rounded-3xl p-5 hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[10px] font-black text-muted-foreground">{formatDate(sale.created_at)}</span>
                       <span className="text-sm font-black text-white">{formatBRL(sale.total)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sale.sale_items?.map((item: any, idx: number) => (
                        <div key={idx} className="bg-background/80 border border-border/50 px-3 py-1.5 rounded-xl text-[10px] font-bold text-muted-foreground">
                          {item.quantity}x {item.description}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {(!customerData.sales || customerData.sales.length === 0) && (
                  <div className="py-10 bg-muted/5 border border-border/50 border-dashed rounded-[32px] text-center space-y-3">
                     <Package className="mx-auto opacity-20" size={32} />
                     <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhuma compra registrada.</p>
                  </div>
                )}
              </div>
            </section>

            <footer className="pt-20 pb-10 text-center space-y-6">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
              <p className="text-xs text-muted-foreground font-medium">Algum problema com seus dados? Fale conosco:</p>
              <a 
                href="https://wa.me/5515996128054" 
                target="_blank" 
                className="inline-flex items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-green-500/20"
              >
                <MessageCircle size={18} /> Chamar Suporte
              </a>
              <div className="pt-10">
                <button onClick={() => setSearchDone(false)} className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] hover:text-white transition-colors underline underline-offset-8 decoration-primary/30">
                  Trocar Conta / Sair
                </button>
              </div>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
