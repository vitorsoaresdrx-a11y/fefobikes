import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreChat } from "@/components/shop/StoreChat";
import { PromoBanner } from "@/components/shop/PromoBanner";
import { Search, Bike, Package, Tag, Zap, ArrowRight, Loader2 } from "lucide-react";

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

// ─── Urban Components ────────────────────────────────────────────────────────

const Marquee = () => (
  <div className="w-full bg-[#EFFF00] text-black overflow-hidden py-2 border-b-2 border-black flex z-40 relative">
    <div className="flex whitespace-nowrap animate-[shimmer_20s_linear_infinite]">
      {[...Array(10)].map((_, i) => (
        <span key={i} className="font-['Syne'] font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] px-4 flex items-center gap-4">
          FRETE GRÁTIS ACIMA DE R$499 <Zap size={10} /> NOVOS COMPONENTES CHEGARAM <Zap size={10} /> 
        </span>
      ))}
    </div>
  </div>
);

function ProductCard({ p }: { p: PublicProduct }) {
  const price = p.price_ecommerce || p.pix_price || p.sale_price || 0;
  const mainImage = p.images?.[0];

  return (
    <Link 
      to={`/produto/${p.sku}`} 
      className="group flex flex-col bg-black border-2 border-white/10 hover:border-[#EFFF00] transition-colors relative"
    >
      {/* Imagem (Area) */}
      <div className="aspect-[4/5] sm:aspect-square relative overflow-hidden bg-white/5 p-4 flex items-center justify-center">
        {mainImage ? (
          <img 
            src={getOptimizedImageUrl(mainImage, 600, 80) || mainImage} 
            alt={p.name}
            className="w-full h-full object-contain filter grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10">
            {p._type === 'bike' ? <Bike size={64} strokeWidth={1} /> : <Package size={64} strokeWidth={1} />}
          </div>
        )}
        
        {/* Badges Urbandas */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {p.price_ecommerce && p.pix_price && p.pix_price < p.price_ecommerce && (
             <div className="bg-[#EFFF00] text-black px-2 py-0.5 font-['Syne'] font-bold text-[10px] tracking-wider uppercase">
               -{Math.round(((p.price_ecommerce - p.pix_price) / p.price_ecommerce) * 100)}%
             </div>
          )}
          {p._type === 'bike' && (
             <div className="bg-[#0033FF] text-white px-2 py-0.5 font-['Syne'] font-bold text-[10px] tracking-wider uppercase">
               BIKE
             </div>
          )}
        </div>
      </div>
      
      {/* Detalhes Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between border-t-2 border-white/10 group-hover:border-[#EFFF00] transition-colors bg-gradient-to-t from-black via-black to-transparent">
        <div className="space-y-1 sm:space-y-2 mb-4">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] font-['Space_Grotesk']">
            {p.category || 'GEAR'}
          </p>
          <h3 className="text-sm sm:text-base font-['Syne'] font-bold text-white leading-tight line-clamp-2 group-hover:text-[#EFFF00] transition-colors">
            {p.name}
          </h3>
        </div>
        
        <div className="flex items-end justify-between">
           <span className="text-lg sm:text-xl font-['Space_Grotesk'] font-bold text-white">{formatBRL(price)}</span>
           <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-white/20 group-hover:border-black group-hover:bg-[#EFFF00] group-hover:text-black text-white flex items-center justify-center transition-all bg-black">
              <ArrowRight size={16} strokeWidth={3} className="group-hover:-rotate-45 transition-transform" />
           </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Store() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("TUDO");
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
  const categoriesList = ["TUDO", "BIKES", ...uniqueCategories.filter(c => c !== "Bikes").map(c => c.toUpperCase())];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "TUDO" || 
                     (activeCategory === "BIKES" && p._type === "bike") ||
                     p.category?.toUpperCase() === activeCategory;
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
      if (data.skus?.length > 0) setActiveCategory("TUDO");
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiSearching(false);
    }
  };

  const aiProducts = products.filter(p => aiSkus.includes(p.sku));
  const displayProducts = aiSkus.length > 0 ? aiProducts : filteredProducts;

  return (
    <div className="min-h-screen bg-black text-white font-['Space_Grotesk'] selection:bg-[#EFFF00] selection:text-black flex flex-col">
      <Marquee />
      
      {/* ── HEADER BOLD ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b-2 border-white/10 px-4 md:px-8 py-4 md:h-24 flex items-center justify-between gap-4 md:gap-8">
        <Link to="/store" className="flex items-center gap-2 md:gap-4 group shrink-0" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 md:w-14 md:h-14 bg-[#EFFF00] text-black flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Bike className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="font-['Syne'] font-extrabold text-xl md:text-3xl tracking-tighter uppercase leading-none text-white group-hover:text-[#EFFF00] transition-colors">FEFO BIKES</span>
            <span className="font-['Space_Grotesk'] font-bold text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-white/50">PERFORMANCE R.</span>
          </div>
        </Link>

        {/* Search Desktop */}
        <div className="flex-1 max-w-2xl relative hidden lg:block group">
          <input 
            type="text"
            placeholder="ENCONTRE SUA PERFORMANCE"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (aiSkus.length > 0) setAiSkus([]);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            className="w-full h-14 bg-transparent border-2 border-white/20 text-white font-['Space_Grotesk'] font-bold uppercase tracking-widest pl-14 pr-32 focus:outline-none focus:border-[#EFFF00] transition-colors placeholder:text-white/20"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#EFFF00] transition-colors" size={20} />
          <button 
            onClick={handleAiSearch}
            disabled={isAiSearching || search.length < 3}
            className="absolute right-2 top-2 bottom-2 px-6 bg-[#0033FF] text-white font-['Syne'] font-bold text-[10px] uppercase tracking-widest hover:bg-black hover:border hover:border-[#0033FF] disabled:opacity-0 transition-all flex items-center justify-center"
          >
            {isAiSearching ? <Loader2 size={14} className="animate-spin" /> : "PROCURAR"}
          </button>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <Link to="/minha-garagem" className="h-10 md:h-14 px-4 md:px-8 bg-transparent border-2 border-white text-[10px] md:text-xs font-['Syne'] font-bold text-white hover:bg-white hover:text-black transition-colors flex items-center gap-2 uppercase tracking-[0.1em]">
            <span className="hidden sm:inline">GARAGEM</span> <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Search Mobile */}
      <div className="lg:hidden p-4 border-b-2 border-white/10 relative">
        <input 
            type="text"
            placeholder="PROCURAR..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (aiSkus.length > 0) setAiSkus([]);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            className="w-full h-12 bg-white/5 border border-white/20 text-white font-['Space_Grotesk'] font-bold uppercase tracking-widest px-4 focus:outline-none focus:border-[#EFFF00] transition-colors placeholder:text-white/30"
          />
      </div>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-16 space-y-12 md:space-y-24">
        
        {/* Banner Substituido por título colossal se não tiver ai search */}
        {!aiSkus.length && !search && (
          <section className="space-y-6">
            <h1 className="font-['Syne'] text-5xl md:text-8xl lg:text-[140px] font-black uppercase leading-[0.85] tracking-tighter break-words text-white">
              PUSH <br/>
              YOUR <br/>
              <span className="text-transparent" style={{ WebkitTextStroke: "2px #EFFF00" }}>LIMITS.</span>
            </h1>
            <p className="max-w-md font-['Space_Grotesk'] text-white/50 text-sm md:text-base leading-relaxed">
              Equipamento de alta performance para quem não aceita o segundo lugar. Engineered in Sorocaba.
            </p>
          </section>
        )}

        {/* Categorias */}
        <section className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`h-10 md:h-12 px-6 md:px-8 font-['Syne'] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap border-2 ${
                activeCategory === cat 
                ? "bg-[#EFFF00] text-black border-[#EFFF00]" 
                : "bg-transparent text-white border-white/20 hover:border-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </section>

        {/* Grade de Produtos */}
        <section className="space-y-8 pb-32">
          
          <div className="flex items-end justify-between border-b-2 border-white/20 pb-4">
            <h2 className="text-lg md:text-3xl font-['Syne'] font-black text-white uppercase tracking-tighter">
              {aiSkus.length > 0 ? (
                <span className="text-[#0033FF]">CURIADORIA DA IA ↓</span>
              ) : (
                <>SELECIONADOS <span className="text-white/30">({displayProducts.length})</span></>
              )}
            </h2>
            {aiSkus.length > 0 && (
              <button onClick={() => setAiSkus([])} className="text-[10px] font-black text-[#EFFF00] uppercase tracking-[0.1em] hover:underline pb-1">
                 [ LIMPAR FILTRO IA ]
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-white/10 border-2 border-white/10">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-black animate-pulse" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-white/10 border-2 border-white/10">
              {displayProducts.map(p => (
                <ProductCard key={`${p._type}-${p.id}`} p={p} />
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 border-2 border-white/20 flex items-center justify-center text-white/20 rotate-45">
                 <Search size={40} className="-rotate-45" />
              </div>
              <div className="space-y-2 max-w-sm">
                <p className="text-2xl font-['Syne'] font-black uppercase tracking-tighter">NADA AQUI.</p>
                <p className="text-sm font-['Space_Grotesk'] text-white/50">Tente ajustar seus filtros ou use a IA para uma busca avançada.</p>
              </div>
            </div>
          )}
        </section>

      </main>

      <footer className="w-full bg-black border-t-2 border-white/20 py-16 px-8 flex flex-col md:flex-row items-start md:items-end justify-between xl:px-16 gap-12 mt-auto">
        <div className="space-y-6">
          <div className="font-['Syne'] font-black text-3xl md:text-5xl uppercase tracking-tighter text-white">
            FEFO<br/>BIKES.
          </div>
          <div className="flex gap-4">
            <a href="#" className="font-['Space_Grotesk'] text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-[#EFFF00]">Instagram</a>
            <a href="#" className="font-['Space_Grotesk'] text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-[#EFFF00]">Contato</a>
            <a href="#" className="font-['Space_Grotesk'] text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-[#EFFF00]">Devoluções</a>
          </div>
        </div>
        
        <div className="text-left md:text-right space-y-2">
          <p className="font-['Space_Grotesk'] text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Onde Estamos</p>
          <p className="font-['Space_Grotesk'] text-sm text-white max-w-[200px]">Av. Ipanema, 1036 — Sorocaba, SP, 18070-671</p>
        </div>
      </footer>

      <CartDrawer />
      <StoreChat />
    </div>
  );
}
