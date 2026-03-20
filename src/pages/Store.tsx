import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Bike, 
  Package, 
  Tag, 
  ChevronRight, 
  Menu,
  LayoutGrid,
  MapPin,
  Filter
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";

// ─── Design System ────────────────────────────────────────────────────────────

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
    {children}
  </span>
);

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
        
        {/* Marketplace Style Price Overlay */}
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
        
        <div className="flex items-center gap-1.5 text-muted-foreground/50 pt-2">
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      // Fetch parts
      const { data: parts } = await supabase
        .from("parts_public" as any)
        .select("*")
        .eq("visible_on_storefront", true) as { data: any[] | null };
      
      const partsFormatted = (parts || []).map(p => ({ ...p, _type: 'part' as const }));

      // Fetch bikes
      const { data: bikes } = await supabase
        .from("bike_models_public" as any)
        .select("*")
        .eq("visible_on_storefront", true) as { data: any[] | null };
      
      const bikesFormatted = (bikes || []).map(b => ({ ...b, _type: 'bike' as const }));

      return [...bikesFormatted, ...partsFormatted].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
  });

  const categories = ["Tudo", "Bikes", "Peças", "Acessórios", "Rodas", "Transmissão"];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Tudo" || 
                           (activeCategory === "Bikes" && p._type === "bike") ||
                           p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-20">
      
      {/* Search Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50 px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4 md:gap-8">
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-sm text-white uppercase tracking-tighter hidden sm:block">Fefo Bikes</span>
        </div>

        <div className="flex-1 max-w-2xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
          <input 
            type="text"
            placeholder="Pesquisar em Fefo Bikes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 md:h-12 bg-secondary/50 border border-border/50 rounded-full pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 focus:bg-secondary"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
            <Filter size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors sm:hidden">
            <Menu size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
        
        {/* Categories Bar */}
        <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map(cat => (
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

        {/* Results Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
              <LayoutGrid size={20} className="text-primary" />
              Resultados de hoje
            </h2>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {filteredProducts.length} itens encontrados
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-3xl bg-card/50 animate-pulse border border-border/20" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {filteredProducts.map(p => (
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

      {/* Footer / Contact */}
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
    </div>
  );
}
