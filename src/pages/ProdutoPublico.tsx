import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPartAttributes } from "@/hooks/usePartAttributes";
import { getOptimizedImageUrl } from "@/lib/image";
import {
  Bike,
  Package,
  ShieldCheck,
  Truck,
  ArrowRight,
  CreditCard,
  ShoppingBag,
  ChevronLeft,
  CheckCircle2,
  Info
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreChat } from "@/components/shop/StoreChat";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { motion, AnimatePresence } from "framer-motion";

import { formatBRL } from "@/lib/format";
import { useState, useEffect } from "react";
import { ShippingSimulator } from "@/components/shop/ShippingSimulator";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
}) => {
  const v = {
    primary: "bg-[#EFFF00] text-black hover:scale-[1.02] shadow-[0_20px_40px_rgba(239,255,0,0.15)] active:scale-[0.98]",
    secondary: "bg-[#0033FF] text-white hover:bg-[#0022AA]",
    outline: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20",
  };
  return (
    <button
      className={`inline-flex items-center justify-center px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${v[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const BadgeEl = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.03] text-white/40 border border-white/5 rounded-lg ${className}`}>
    {children}
  </span>
);

// ─── Header ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-[60] bg-black/90 backdrop-blur-2xl border-b border-white/5 px-6 md:px-12 h-20 md:h-24 flex items-center justify-between">
      <Link to="/store" className="flex items-center gap-4 shrink-0 group">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#EFFF00] text-black flex items-center justify-center shadow-[0_0_30px_rgba(239,255,0,0.15)] group-hover:scale-110 transition-transform">
          <Bike className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-none hidden xs:flex">
          <span className="font-black tracking-tighter text-xl text-white">FEFO</span>
          <span className="font-bold tracking-[0.2em] text-[10px] text-[#EFFF00]">BIKES</span>
        </div>
      </Link>
      <div className="flex gap-4">
        <Link to="/store" className="flex h-12 px-6 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all items-center gap-3">
          <ChevronLeft size={16} /> Voltar à Loja
        </Link>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 border-4 border-white/5 border-t-[#EFFF00] rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EFFF00] animate-pulse">
          Sincronizando Catálogo...
        </span>
      </div>
    </div>
  );
}

// ─── Componentes Especiais ───────────────────────────────────────────────────

function PriceSection({ product }: { product: any }) {
  const ecommercePrice = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
  const installmentsEnabledEcommerce = !!product.installments_enabled_ecommerce;
  const installmentCountEcommerce = Number(product.installment_count_ecommerce) || 0;
  const installmentValueEcommerce = Number(product.installment_value_ecommerce) || 0;
  
  const installmentPrice = installmentsEnabledEcommerce ? installmentValueEcommerce : (Number(product.installment_price) || 0);
  const installmentCount = installmentsEnabledEcommerce ? installmentCountEcommerce : (Number(product.installment_count) || 1);
  const hasInstallments = installmentsEnabledEcommerce ? (installmentCountEcommerce > 1 && installmentValueEcommerce > 0) : (installmentPrice > 0 && installmentCount > 1);
  
  if (!ecommercePrice && !hasInstallments) return null;

  return (
    <section className="space-y-6">
      {ecommercePrice > 0 && (
        <div className="flex flex-col">
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-2xl"
          >
            {formatBRL(ecommercePrice)}
          </motion.p>
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 size={12} className="text-[#EFFF00]" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#EFFF00]">
              Preço Especial à vista
            </p>
          </div>
        </div>
      )}

      {hasInstallments && (
        <div className="p-5 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-5 group hover:bg-white/[0.04] transition-all">
          <div className="w-12 h-12 rounded-xl bg-[#0033FF]/10 text-[#0033FF] flex items-center justify-center border border-[#0033FF]/10">
            <CreditCard size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-base font-black text-white tracking-tight">
              {installmentCount}x de {formatBRL(installmentPrice)} <span className="text-[#0033FF] uppercase text-[10px] ml-1">Sem Juros</span>
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Parcelamento Facilitado</p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ProdutoPublico() {
  const { sku } = useParams<{ sku: string }>();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["public-product", sku],
    enabled: !!sku,
    queryFn: async () => {
      const { data: part } = await supabase
        .from("parts_public" as any)
        .select("*")
        .eq("sku", sku!)
        .maybeSingle() as { data: any };
      if (part) return { ...part, _type: "part" as const };

      const { data: bike } = await supabase
        .from("bike_models_public" as any)
        .select("*")
        .eq("sku", sku!)
        .maybeSingle() as { data: any };
      if (bike) return { ...bike, _type: "bike" as const };

      return null;
    },
  });

  const { data: bikeParts = [] } = useQuery({
    queryKey: ["public-bike-parts", product?.id],
    enabled: !!product && product._type === "bike",
    queryFn: async () => {
      const { data } = await supabase
        .from("bike_model_parts_public" as any)
        .select("*, parts(name)")
        .eq("bike_model_id", product!.id)
        .order("sort_order") as { data: any[] | null };
      return data || [];
    },
  });

  const { data: attrs = [] } = usePublicPartAttributes(product?._type === "part" ? product.id : "");

  if (isLoading) return <LoadingState />;

  if (!product || !product.visible_on_storefront) {
    return (
      <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-[32px] bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/10">
            <Package size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Produto Esgotado</h2>
            <p className="text-white/40 text-sm max-w-sm mx-auto font-medium">
              Este item não está mais disponível em nosso catálogo público.
            </p>
          </div>
          <Link to="/store">
            <Btn variant="primary">Voltar ao Catálogo</Btn>
          </Link>
        </div>
      </div>
    );
  }

  const images: string[] = (product as any).images || [];
  const category = product.category;

  const specs: { label: string; value: string }[] = [];
  if (product._type === "bike") {
    const b = product as any;
    if (b.brand) specs.push({ label: "Marca", value: b.brand });
    if (b.frame_size) specs.push({ label: "Quadro", value: b.frame_size });
    if (b.rim_size) specs.push({ label: "Aro", value: b.rim_size });
    if (b.color) specs.push({ label: "Cor", value: b.color });
    if (b.weight_kg) specs.push({ label: "Peso", value: `${b.weight_kg} kg` });
  } else {
    const p = product as any;
    if (p.material) specs.push({ label: "Material", value: p.material });
    if (p.weight_capacity_kg) specs.push({ label: "Capacidade", value: `${p.weight_capacity_kg} kg` });
    if (p.gears) specs.push({ label: "Marchas", value: p.gears });
    if (p.hub_style) specs.push({ label: "Cubo", value: p.hub_style });
    if (p.color) specs.push({ label: "Cor", value: p.color });
    if (p.rim_size) specs.push({ label: "Aro", value: p.rim_size });
    if (p.frame_size) specs.push({ label: "Quadro", value: p.frame_size });
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] selection:bg-[#EFFF00] selection:text-black flex flex-col pb-20">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-12 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* LADO ESQUERDO: GALERIA STICKY */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-10 lg:sticky lg:top-32 lg:self-start">
            
            {/* Titulo Mobile */}
            <div className="space-y-4 lg:hidden">
               <div className="flex gap-2">
                 <BadgeEl className="text-[#EFFF00] border-[#EFFF00]/20 bg-[#EFFF00]/5">SKU: {sku}</BadgeEl>
                 {category && <BadgeEl>{category}</BadgeEl>}
               </div>
               <h1 className="text-4xl font-black tracking-tighter leading-none italic uppercase">
                 {product.name}
               </h1>
            </div>

            {/* Galeria Premium */}
            <section className="relative group">
              {images.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {images.map((img, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-video xl:aspect-[16/10] bg-[#0A0A0A] border-2 border-white/5 rounded-[40px] flex items-center justify-center p-8 md:p-16 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative">
                          {/* Inner Glow */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#EFFF00]/[0.02] to-transparent pointer-events-none" />
                          
                          <motion.img
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            src={getOptimizedImageUrl(img, 1200, 90) || img}
                            alt={`${product.name} ${i + 1}`}
                            className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {images.length > 1 && (
                     <div className="absolute inset-y-0 left-6 right-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                       <CarouselPrevious className="relative left-0 pointer-events-auto bg-black/80 backdrop-blur-xl border-white/10 text-[#EFFF00] h-14 w-14 rounded-2xl hover:bg-[#EFFF00] hover:text-black transition-all" />
                       <CarouselNext className="relative right-0 pointer-events-auto bg-black/80 backdrop-blur-xl border-white/10 text-[#EFFF00] h-14 w-14 rounded-2xl hover:bg-[#EFFF00] hover:text-black transition-all" />
                     </div>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-video bg-[#0A0A0A] border border-white/5 rounded-[40px] flex items-center justify-center text-white/[0.03]">
                  {product._type === "bike" ? <Bike size={180} strokeWidth={0.5} /> : <Package size={180} strokeWidth={0.5} />}
                </div>
              )}
            </section>

            {/* Benefícios Rápidos */}
            <div className="hidden lg:grid grid-cols-3 gap-6">
               <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-2">
                 <Truck className="text-[#EFFF00]" size={24} />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Logística VIP</p>
                 <p className="text-[11px] text-white/30 font-medium">Entregamos em todo território nacional.</p>
               </div>
               <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-2">
                 <ShieldCheck className="text-[#0033FF]" size={24} />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Segurança</p>
                 <p className="text-[11px] text-white/30 font-medium">Garantia oficial e nota fiscal eletrônica.</p>
               </div>
               <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-2">
                 <Info className="text-white/60" size={24} />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Suporte</p>
                 <p className="text-[11px] text-white/30 font-medium">Especialistas prontos para te atender.</p>
               </div>
            </div>
          </div>

          {/* LADO DIREITO: CONTEÚDO SCROLLABLE */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-12">
            
            {/* Título Desktop */}
            <div className="hidden lg:block space-y-5">
               <div className="flex gap-3">
                 <BadgeEl className="text-[#EFFF00] border-[#EFFF00]/20 bg-[#EFFF00]/5">SKU: {sku}</BadgeEl>
                 {category && <BadgeEl>{category}</BadgeEl>}
               </div>
               <h1 className="text-5xl xl:text-6xl font-black tracking-tighter leading-none italic uppercase drop-shadow-lg">
                 {product.name}
               </h1>
            </div>

            {/* Preço */}
            <PriceSection product={product} />

            {/* CTA */}
            <section className="flex flex-col gap-4">
              <Btn 
                variant="primary" 
                className="w-full py-6 text-[14px] gap-3"
                onClick={() => {
                  const price = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
                  useCart.getState().addItem(product, price);
                  import("sonner").then(({ toast }) => toast.success("Adicionado com sucesso!", {
                    description: "Seu item já está no carrinho.",
                    duration: 3000,
                  }));
                }}
              >
                <ShoppingBag size={22} strokeWidth={2.5} /> COMPRAR AGORA
              </Btn>
              
              <Btn 
                variant="outline" 
                className="w-full py-5 text-[11px] border-white/5 bg-transparent"
                onClick={() => setIsChatOpen(true)}
              >
                TIRAR DÚVIDAS COM IA
              </Btn>
            </section>

            {/* Calculadora de Frete - Estilo Pro Max */}
            <ShippingSimulator 
              invoiceValue={Number(product.price_ecommerce) || Number(product.pix_price) || 0} 
              productType={product._type}
              className="mt-4"
            />

            {/* Detalhes Técnicos e Gerais */}
            <div className="flex flex-col gap-12 pt-10 border-t border-white/10">
              
              {/* Descrição */}
              {(product as any).description && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/20">Apresentação</h3>
                  <div className="text-white/60 leading-relaxed text-[15px] whitespace-pre-line antialiased font-medium">
                    {(product as any).description}
                  </div>
                </div>
              )}

              {/* Especificações */}
              {((product._type === "bike" && bikeParts.length > 0) || attrs.length > 0 || specs.length > 0) && (
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/20">Especificações Técnicas</h3>
                  <div className="grid grid-cols-1 gap-3">
                    
                    {/* Lista de Specs e Atributos */}
                    {[...specs, ...attrs].map((s: any, idx: number) => (
                      <div key={`spec-${idx}`} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group/spec hover:bg-white/[0.05] transition-all">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover/spec:text-white transition-colors">{s.label || s.name}</span>
                        <span className="text-sm font-black text-white">{s.value}</span>
                      </div>
                    ))}

                    {/* Lista de Componentes da Bike */}
                    {product._type === "bike" && bikeParts.map((bp: any) => (
                      <div key={`bp-${bp.id}`} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group/spec hover:bg-white/[0.05] transition-all">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 truncate max-w-[200px]">{bp.parts?.name || bp.part_name_override || "Componente"}</span>
                        <span className="text-[10px] font-black text-[#EFFF00] bg-[#EFFF00]/10 px-3 py-1.5 rounded-lg border border-[#EFFF00]/10">x{bp.quantity}</span>
                      </div>
                    ))}
                    
                  </div>
                </div>
              )}

              {/* Garantia e Envio */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 p-6 rounded-[28px] bg-gradient-to-br from-white/[0.03] to-transparent border border-[#EFFF00]/20 shadow-lg group/card hover:border-[#EFFF00]/50 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-[#EFFF00] text-black flex items-center justify-center shadow-[0_10px_20px_rgba(239,255,0,0.2)]">
                    <ShieldCheck size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col pt-2">
                    <span className="text-sm font-black text-white italic tracking-tight uppercase">Garantia Fefo</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">90 Dias de Segurança</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 p-6 rounded-[28px] bg-gradient-to-br from-white/[0.03] to-transparent border border-[#0033FF]/20 shadow-lg group/card hover:border-[#0033FF]/50 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-[#0033FF] text-white flex items-center justify-center shadow-[0_10px_20px_rgba(0,51,255,0.2)]">
                    <Truck size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col pt-2">
                    <span className="text-sm font-black text-white italic tracking-tight uppercase">Envio VIP</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Sua Bike Intacta</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <CartDrawer />
      <StoreChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
