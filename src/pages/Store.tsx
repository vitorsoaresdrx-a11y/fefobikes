import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreChat } from "@/components/shop/StoreChat";
import { Search, Bike, Package, ArrowRight, Loader2, Filter, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

function ProductCard({ p, index }: { p: PublicProduct; index: number }) {
  const { addItem } = useCart();
  const price = p.price_ecommerce || p.pix_price || p.sale_price || 0;
  const mainImage = p.images?.[0];
  const discount = p.price_ecommerce && p.pix_price && p.pix_price < p.price_ecommerce 
    ? Math.round(((p.price_ecommerce - p.pix_price) / p.price_ecommerce) * 100) 
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(p, price);
    toast.success(`${p.name} adicionado ao carrinho!`, {
      description: "Confira seu carrinho para finalizar.",
      duration: 3000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="w-full"
    >
      <Link 
        to={`/produto/${p.sku}`} 
        className="group flex flex-row sm:flex-col bg-[#0A0A0A] rounded-[20px] sm:rounded-[32px] border border-white/5 hover:border-[#EFFF00]/30 transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFFF00] relative items-center sm:items-stretch"
        aria-label={`Ver produto: ${p.name}, Preço atual: ${formatBRL(price)}`}
      >
        {/* Imagem */}
        <div className="w-[120px] h-[120px] sm:w-full sm:aspect-[4/3] bg-white/[0.02] relative flex items-center justify-center p-4 sm:p-8 shrink-0 overflow-hidden border-r sm:border-r-0 sm:border-b border-white/5">
          {mainImage ? (
            <img 
              src={getOptimizedImageUrl(mainImage, 600, 80) || mainImage} 
              alt={`Imagem do produto ${p.name}`}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          ) : (
            <div className="text-white/5">
              {p._type === 'bike' ? <Bike size={48} strokeWidth={1} /> : <Package size={48} strokeWidth={1} />}
            </div>
          )}
          
          {/* Badges Funcionais */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-1 sm:gap-2">
            {discount > 0 && (
              <span className="bg-[#EFFF00] text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-xl">
                -{discount}%
              </span>
            )}
            {p._type === 'bike' && (
              <span className="bg-[#0033FF] text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-xl backdrop-blur-md">
                Bike
              </span>
            )}
          </div>
        </div>
        
        {/* Informações */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col gap-0.5 sm:gap-1 justify-center sm:justify-start min-w-0">
          <div className="space-y-0.5 sm:space-y-1 mb-1 sm:mb-2">
            <span className="text-[9px] sm:text-[10px] font-black text-white/20 tracking-[0.2em] uppercase truncate block">
              {p.category || 'Geral'}
            </span>
            <h3 className="text-[14px] sm:text-base font-bold text-white/90 leading-tight line-clamp-2 group-hover:text-white transition-colors">
              {p.name}
            </h3>
          </div>
          
          <div className="mt-1 sm:mt-2 flex items-center justify-between">
            <div className="flex flex-col">
              {discount > 0 && (
                <span className="text-[10px] sm:text-xs text-white/20 line-through mb-0 sm:mb-0.5 font-medium">
                  {formatBRL(p.price_ecommerce || 0)}
                </span>
              )}
              <span className="text-base sm:text-xl font-black text-[#EFFF00] tracking-tight">
                {formatBRL(price)}
              </span>
            </div>
            
            {/* Adicionar ao Carrinho */}
            <motion.button 
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              onClick={handleQuickAdd}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 group-hover:bg-[#EFFF00] group-hover:text-black flex items-center justify-center transition-all shadow-lg active:shadow-inner border border-white/5 group-hover:border-transparent ml-2"
              title="Adicionar ao Carrinho"
              aria-label={`Adicionar ${p.name} ao carrinho`}
            >
              <ShoppingBag size={18} className="sm:size-5 group-hover:rotate-12 transition-transform" />
            </motion.button>
          </div>
        </div>
        
        {/* Desktop-only Visual Line at Bottom */}
        <div className="hidden sm:block absolute bottom-0 left-0 w-full h-1 bg-[#EFFF00] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </Link>
    </motion.div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {displayProducts.map((p, idx) => (
                <ProductCard key={`${p._type}-${p.id}`} p={p} index={idx} />
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
