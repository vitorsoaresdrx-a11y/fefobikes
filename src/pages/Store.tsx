import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreChat } from "@/components/shop/StoreChat";
import { PromoBanner } from "@/components/shop/PromoBanner";
import { 
  Search, 
  Bike, 
  Package, 
  Tag, 
  LayoutGrid, 
  MapPin, 
  Filter,
  Menu,
  User,
  Zap,
  TrendingUp,
  Loader2
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  price_ecommerce: number | null;
  sale_price?: number | null;
  pix_price?: number | null;
  category: string | null;
  images: string[] | null;
  description: string | null;
  created_at?: string;
  _type: 'part' | 'bike';
}

// ─── Components ───────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: PublicProduct }) {
  const price = p.price_ecommerce || p.pix_price || p.sale_price || 0;
  const mainImage = p.images?.[0];

  return (
    <Link 
      to={`/produto/${p.sku}`} 
      className="group flex flex-col bg-card border border-border/40 rounded-3xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.98]"
    >
      <div className="aspect-square relative overflow-hidden bg-muted/20">
        {mainImage ? (
          <img 
            src={getOptimizedImageUrl(mainImage, 600, 80) || mainImage} 
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex flex-center items-center justify-center text-muted-foreground/30">
            {p._type === 'bike' ? <Bike size={48} strokeWidth={1} /> : <Package size={48} strokeWidth={1} />}
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {p._type === 'bike' && (
             <div className="bg-primary/90 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white flex items-center gap-1 uppercase tracking-widest shadow-lg">
               <Bike size={10} />
             </div>
          )}
          {p.price_ecommerce && p.pix_price && p.pix_price < p.price_ecommerce && (
             <div className="bg-yellow-400 px-2 py-1 rounded-lg text-[8px] font-black text-black flex items-center gap-1 uppercase tracking-widest shadow-lg animate-bounce">
               <Zap size={10} fill="currentColor" /> {Math.round(((p.price_ecommerce - p.pix_price) / p.price_ecommerce) * 100)}% OFF
             </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
          <span className="text-sm font-black text-white">{formatBRL(price)}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            {p._type === 'bike' ? <Bike size={10} /> : <Tag size={10} />}
            {p.category || 'Geral'}
          </p>
          <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {p.name}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5 text-muted-foreground/50 pt-2 border-t border-border/20">
          <MapPin size={10} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Fefo Bikes Store</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Store() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Tudo");
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSkus, setAiSkus] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("parts_public" as any)
        .select("*")
        .eq("visible_on_storefront", true) as { data: any[] | null };
      
      const partsFormatted = (parts || []).map(p => ({ ...p, _type: 'part' as const }));

      const { data: bikes } = await supabase
        .from("bike_models_public" as any)
        .select("*")
        .eq("visible_on_storefront", true) as { data: any[] | null };
      
      const bikesFormatted = (bikes || []).map(b => ({ ...b, _type: 'bike' as const }));

      return [...bikesFormatted, ...partsFormatted].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ) as PublicProduct[];
    }
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const categoriesList = ["Tudo", "Bikes", ...uniqueCategories.filter(c => c !== "Bikes")];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Tudo" || 
                           (activeCategory === "Bikes" && p._type === "bike") ||
                           p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAiSearch = async () => {
    if (!search || search.length < 3) return;
    setIsAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("store-ai-chat", {
        body: { message: search, isSearch: true }
      });
      if (error) throw error;
      setAiSkus(data.skus || []);
      if (data.skus?.length > 0) setActiveCategory("Tudo");
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiSearching(false);
    }
  };

  const aiProducts = products.filter(p => aiSkus.includes(p.sku));
  const displayProducts = aiSkus.length > 0 ? aiProducts : filteredProducts;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-20">
      
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50 px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4 md:gap-8">
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-sm text-white uppercase tracking-tighter hidden sm:block">Fefo Bikes</span>
        </div>

        <div className="flex-1 max-w-2xl relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
          <input 
            type="text"
            placeholder="O que você procura hoje?"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (aiSkus.length > 0) setAiSkus([]); // Reset AI search on type
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            className="w-full h-10 md:h-12 bg-secondary/50 border border-border/50 rounded-full pl-12 pr-32 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 focus:bg-secondary"
          />
          <button 
            onClick={handleAiSearch}
            disabled={isAiSearching || search.length < 3}
            className="absolute right-1.5 top-1.5 h-7 md:h-9 px-3 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            {isAiSearching ? <Loader2 size={12} className="animate-spin" /> : <><TrendingUp size={12} /> IA</>}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/minha-garagem" className="h-10 md:h-12 px-4 md:px-6 bg-card border border-border rounded-2xl text-[10px] md:text-xs font-black text-white hover:bg-muted transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 shadow-xl">
            <User size={14} className="text-primary lg:w-4 lg:h-4" /> <span className="hidden sm:inline">Minha Garagem</span>
          </Link>
          <button className="md:hidden p-2 rounded-xl bg-card border border-border text-white">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-10 md:space-y-16">
        <PromoBanner />
        
        <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeCategory === cat 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
              {aiSkus.length > 0 ? <TrendingUp size={20} className="text-primary" /> : <LayoutGrid size={20} className="text-primary" />}
              {aiSkus.length > 0 ? "Sugestões da IA" : "Resultados de hoje"}
            </h2>
            <div className="flex items-center gap-4">
              {aiSkus.length > 0 && (
                <button onClick={() => setAiSkus([])} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                  Limpar Filtro IA
                </button>
              )}
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {displayProducts.length} itens encontrados
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-3xl bg-card/50 animate-pulse border border-border/20" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {displayProducts.map(p => (
                <ProductCard key={`${p._type}-${p.id}`} p={p} />
              ))}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
              <Search size={48} strokeWidth={1} />
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest">Nada encontrado</p>
                <p className="text-xs font-medium">Tente ajustar sua pesquisa ou filtros.</p>
              </div>
            </div>
          )}
        </section>

      </main>

      <footer className="mt-12 py-12 border-t border-border/50 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center">
            <Bike className="w-4 h-4 text-primary" />
          </div>
          <span className="font-black text-xs text-muted-foreground uppercase tracking-widest">Fefo Bikes Store © 2026</span>
        </div>
        
        <div className="flex gap-4">
          <a href="#" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-white transition-colors">Termos de Uso</a>
        </div>
      </footer>

      <CartDrawer />
      <StoreChat />
    </div>
  );
}
