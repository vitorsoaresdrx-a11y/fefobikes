import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreChat } from "@/components/shop/StoreChat";
import { Search, Bike, Package, ArrowRight, Loader2, Filter, ShoppingBag } from "lucide-react";

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

// ─── Componentes ─────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: PublicProduct }) {
  const price = p.price_ecommerce || p.pix_price || p.sale_price || 0;
  const mainImage = p.images?.[0];
  const discount = p.price_ecommerce && p.pix_price && p.pix_price < p.price_ecommerce 
    ? Math.round(((p.price_ecommerce - p.pix_price) / p.price_ecommerce) * 100) 
    : 0;

  return (
    <Link 
      to={`/produto/${p.sku}`} 
      className="group flex flex-col bg-[#0A0A0A] rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden"
    >
      {/* Imagem */}
      <div className="aspect-[4/3] bg-white/5 relative flex items-center justify-center p-6 overflow-hidden">
        {mainImage ? (
          <img 
            src={getOptimizedImageUrl(mainImage, 600, 80) || mainImage} 
            alt={p.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-white/20">
            {p._type === 'bike' ? <Bike size={48} strokeWidth={1} /> : <Package size={48} strokeWidth={1} />}
          </div>
        )}
        
        {/* Badges Funcionais */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount > 0 && (
             <span className="bg-[#EFFF00] text-black px-2 py-1 rounded-md text-[10px] font-bold tracking-wide">
               {discount}% OFF
             </span>
          )}
          {p._type === 'bike' && (
             <span className="bg-[#0033FF] text-white px-2 py-1 rounded-md text-[10px] font-medium tracking-wide">
               Bicicleta
             </span>
          )}
        </div>
      </div>
      
      {/* Informações */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="space-y-1 mb-auto">
          <p className="text-[11px] font-medium text-white/50 tracking-wide uppercase">
            {p.category || 'Geral'}
          </p>
          <h3 className="text-[15px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {p.name}
          </h3>
        </div>
        
        <div className="mt-5 flex items-end justify-between">
           <div className="flex flex-col">
              {discount > 0 && <span className="text-xs text-white/40 line-through mb-0.5">{formatBRL(p.price_ecommerce || 0)}</span>}
              <span className="text-lg font-semibold text-white">{formatBRL(price)}</span>
           </div>
           <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#EFFF00] group-hover:text-black flex items-center justify-center transition-colors text-white/50">
              <ShoppingBag size={14} />
           </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

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
    const matchCat = activeCategory === "Tudo" || 
                     (activeCategory === "Bikes" && p._type === "bike") ||
                     p.category === activeCategory;
    return matchesSearch && matchCat;
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
    <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] selection:bg-[#EFFF00] selection:text-black flex flex-col pb-10">
      
      {/* ── HEADER CLEAN ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 md:px-12 h-20 flex items-center justify-between gap-6">
        <Link to="/store" className="flex items-center gap-3 shrink-0" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 rounded-lg bg-[#EFFF00] text-black flex items-center justify-center">
            <Bike className="w-5 h-5" strokeWidth={2} />
          </div>
          <span className="font-bold tracking-tight text-lg text-white">Fefo Bikes</span>
        </Link>

        {/* Search Desktop */}
        <div className="flex-1 max-w-2xl relative hidden md:block group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text"
            placeholder="Pesquisar componentes, bikes e acessórios..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (aiSkus.length > 0) setAiSkus([]);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            className="w-full h-11 bg-white/5 border border-white/10 rounded-xl text-white text-sm pl-12 pr-28 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-white/40"
          />
          <button 
            onClick={handleAiSearch}
            disabled={isAiSearching || search.length < 3}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-white/10 text-white rounded-lg text-xs font-medium hover:bg-white/20 disabled:opacity-0 transition-all flex items-center justify-center gap-2"
          >
            {isAiSearching ? <Loader2 size={14} className="animate-spin" /> : "IA Buscar"}
          </button>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Link to="/minha-garagem" className="h-10 px-5 rounded-xl bg-white/10 border border-white/5 text-sm font-medium text-white hover:bg-white/20 transition-colors flex items-center gap-2">
            Minha Garagem
          </Link>
        </div>
      </header>

      {/* Search Mobile */}
      <div className="md:hidden p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (aiSkus.length > 0) setAiSkus([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white text-sm pl-12 pr-4 focus:outline-none focus:border-white/30 transition-colors"
            />
        </div>
      </div>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-12 py-10 space-y-10">
        
        {/* Filtros e Categorias */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-9 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  activeCategory === cat 
                  ? "bg-white text-black border-white" 
                  : "bg-transparent text-white/70 border-white/20 hover:border-white/50 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
             <div className="text-sm font-medium text-white/50">
               {displayProducts.length} resultados
             </div>
             {aiSkus.length > 0 && (
                <button onClick={() => setAiSkus([])} className="text-sm text-[#0033FF] hover:text-[#EFFF00] font-medium transition-colors">
                  Limpar Inteligência Artificial
                </button>
             )}
          </div>
        </section>

        {/* Grade de Produtos */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {displayProducts.map(p => (
                <ProductCard key={`${p._type}-${p.id}`} p={p} />
              ))}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-2">
                 <Package size={24} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Nenhum produto encontrado</h2>
              <p className="text-sm text-white/50 max-w-sm">
                Ajuste os filtros de categoria ou tente um termo diferente na pesquisa.
              </p>
            </div>
          )}
        </section>

      </main>

      <footer className="w-full max-w-[1400px] mx-auto px-6 md:px-12 mt-20 pt-10 border-t border-white/10 flex items-center justify-between text-white/40 text-sm">
         <div className="flex items-center gap-2">
            <Bike size={16} />
            <span>Fefo Bikes © 2026. Todos os direitos reservados.</span>
         </div>
      </footer>

      <CartDrawer />
      <StoreChat />
    </div>
  );
}
