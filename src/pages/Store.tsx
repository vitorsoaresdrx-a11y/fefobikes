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
      className="group flex flex-col bg-[#0A0A0A] rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00]"
      aria-label={`Ver produto: ${p.name}, Preço atual: ${formatBRL(price)}`}
    >
      {/* Imagem */}
      <div className="aspect-[4/3] bg-white/5 relative flex items-center justify-center p-6 overflow-hidden">
        {mainImage ? (
          <img 
            src={getOptimizedImageUrl(mainImage, 600, 80) || mainImage} 
            alt={`Imagem do produto ${p.name}`}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="text-white/20">
            {p._type === 'bike' ? <Bike size={48} strokeWidth={1} /> : <Package size={48} strokeWidth={1} />}
          </div>
        )}
        
        {/* Badges Funcionais */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
             <span className="bg-[#EFFF00] text-black px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
               {discount}% OFF
             </span>
          )}
          {p._type === 'bike' && (
             <span className="bg-[#0033FF] text-white px-2.5 py-1 rounded-md text-xs font-medium tracking-wide">
               Bicicleta
             </span>
          )}
        </div>
      </div>
      
      {/* Informações */}
      <div className="p-5 flex-1 flex flex-col gap-2">
        <div className="space-y-1 mb-auto">
          <p className="text-xs font-medium text-white/50 tracking-wide uppercase">
            {p.category || 'Geral'}
          </p>
          <h3 className="text-[15px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {p.name}
          </h3>
        </div>
        
        <div className="mt-4 flex items-end justify-between">
           <div className="flex flex-col">
              {discount > 0 && <span className="text-xs text-white/50 line-through mb-0.5">{formatBRL(p.price_ecommerce || 0)}</span>}
              <span className="text-lg font-semibold text-white">{formatBRL(price)}</span>
           </div>
           
           {/* Adicionar ao Carrinho (Botão Mínimo de 44x44px em mobile) */}
           <div 
             className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white/5 group-hover:bg-[#EFFF00] group-hover:text-black flex items-center justify-center transition-colors text-white/50 -mt-2 -mr-2 sm:mt-0 sm:mr-0"
             aria-hidden="true"
           >
              <ShoppingBag size={18} />
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
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 md:px-12 h-[72px] md:h-20 flex items-center justify-between gap-6">
        <Link 
          to="/store" 
          className="flex items-center gap-3 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00]" 
          onClick={() => window.location.reload()}
          aria-label="Atualizar Página Fefo Bikes"
        >
          <div className="w-10 h-10 rounded-lg bg-[#EFFF00] text-black flex items-center justify-center">
            <Bike className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <span className="font-bold tracking-tight text-xl text-white hidden sm:block">Fefo Bikes</span>
        </Link>

        {/* Search Desktop */}
        <div className="flex-1 max-w-2xl relative hidden md:block group">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-white/50" size={20} aria-hidden="true" />
            <input 
              type="text"
              placeholder="Pesquisar componentes, bikes e acessórios..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (aiSkus.length > 0) setAiSkus([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white text-[15px] pl-12 pr-32 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-white/40"
              aria-label="Campo de pesquisa"
            />
            <button 
              onClick={handleAiSearch}
              disabled={isAiSearching || search.length < 3}
              className="absolute right-1.5 px-4 h-9 bg-white/10 text-white rounded-lg text-xs font-semibold hover:bg-white/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Pesquisar usando Inteligência Artificial"
            >
              {isAiSearching ? <Loader2 size={14} className="animate-spin" /> : "IA Buscar"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Link 
            to="/minha-garagem" 
            className="h-11 px-5 rounded-xl bg-white/10 border border-white/5 text-sm font-semibold text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Minha Garagem
          </Link>
        </div>
      </header>

      {/* Search Mobile */}
      <div className="md:hidden px-4 py-3 border-b border-white/10 bg-black">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-white/50" size={18} aria-hidden="true" />
          <input 
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (aiSkus.length > 0) setAiSkus([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white text-[15px] pl-12 pr-4 focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/40"
              aria-label="Campo de pesquisa mobile"
            />
        </div>
      </div>

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-12 py-8 md:py-10 space-y-8 md:space-y-10">
        
        {/* Filtros e Categorias */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div 
            className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide"
            role="tablist"
            aria-label="Filtro de Categorias"
          >
            {categoriesList.map(cat => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-11 px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white border ${
                  activeCategory === cat 
                  ? "bg-white text-black border-white shadow-sm" 
                  : "bg-transparent text-white/70 border-white/20 hover:border-white/50 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
             <div className="text-sm font-medium text-white/50" aria-live="polite">
               {displayProducts.length} resultados
             </div>
             {aiSkus.length > 0 && (
                <button 
                  onClick={() => setAiSkus([])} 
                  className="h-11 px-4 text-sm text-[#0033FF] hover:text-[#0022AA] bg-[#0033FF]/10 rounded-lg hover:bg-[#0033FF]/20 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033FF]"
                >
                  Limpar Busca IA
                </button>
             )}
          </div>
        </section>

        {/* Grade de Produtos */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" aria-busy="true">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.map(p => (
                <ProductCard key={`${p._type}-${p.id}`} p={p} />
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-2">
                 <Package size={24} aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Nenhum produto encontrado</h2>
              <p className="text-[15px] text-white/50 max-w-sm">
                Ajuste os filtros de categoria ou tente um termo diferente na pesquisa.
              </p>
            </div>
          )}
        </section>

      </main>

      <footer className="w-full max-w-[1280px] mx-auto px-6 md:px-12 py-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/40 text-sm mt-auto">
         <div className="flex items-center gap-2 text-white/60">
            <Bike size={16} />
            <span className="font-semibold tracking-wide">Fefo Bikes © 2026. Todos os direitos reservados.</span>
         </div>
      </footer>

      <CartDrawer />
      <StoreChat />
    </div>
  );
}
