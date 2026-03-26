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
import { motion } from "framer-motion";

import { formatBRL } from "@/lib/format";
import { useState } from "react";

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
    primary: "bg-[#EFFF00] text-black hover:bg-white transition-colors",
    secondary: "bg-[#0033FF] text-white hover:bg-[#0022AA] transition-colors",
    outline: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-colors",
  };
  return (
    <button
      className={`inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-50 ${v[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const BadgeEl = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2.5 py-1 text-xs font-semibold tracking-wide bg-white/5 text-white/70 border border-white/10 rounded-md">
    {children}
  </span>
);

// ─── Header / Footer ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 md:px-12 h-20 flex items-center justify-between">
      <Link to="/store" className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#EFFF00] text-black flex items-center justify-center">
          <Bike className="w-5 h-5" strokeWidth={2} />
        </div>
        <span className="font-bold tracking-tight text-lg text-white">Fefo Bikes</span>
      </Link>
      <div className="flex gap-4">
        <Link to="/store" className="flex h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-colors items-center gap-2">
          <ChevronLeft size={14} /> Voltar à Loja
        </Link>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#EFFF00] rounded-full animate-spin" />
        <span className="text-sm font-medium text-white/50 animate-pulse">
          Carregando produto...
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
    <section className="space-y-4 py-4">
      {ecommercePrice > 0 && (
        <div className="flex flex-col">
          <p className="text-3xl lg:text-5xl font-bold tracking-tight text-white mb-2">
            {formatBRL(ecommercePrice)}
          </p>
          <p className="text-sm font-medium text-white/50">
            Preço à vista no PIX
          </p>
        </div>
      )}

      {hasInstallments && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#0033FF]/20 text-[#0033FF] flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {installmentCount}x de {formatBRL(installmentPrice)} sem juros
            </p>
            <p className="text-xs font-medium text-white/50 mt-0.5">Cartão de Crédito</p>
          </div>
        </div>
      )}
    </section>
  );
}

import { ShippingSimulator } from "@/components/shop/ShippingSimulator";

// ─── Componentes Especiais ───────────────────────────────────────────────────

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ProdutoPublico() {
  const { sku } = useParams<{ sku: string }>();

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
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
            <Package size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Produto Indisponível</h2>
            <p className="text-white/50 text-sm max-w-sm mx-auto">
              O item que você procura não está mais disponível ou não existe.
            </p>
          </div>
          <Link to="/store">
            <Btn variant="outline" className="text-sm">Explorar Catálogo</Btn>
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
    <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] selection:bg-[#EFFF00] selection:text-black flex flex-col pb-32">
      <Header />

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-12 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
          
          {/* LADO ESQUERDO: GALERIA E DESCRIÇÃO */}
          <div className="space-y-8 md:space-y-12">
            
            {/* Titulo Mobile */}
            <div className="space-y-3 lg:hidden">
               <div className="flex gap-2">
                 <BadgeEl>SKU: {sku}</BadgeEl>
                 {category && <BadgeEl>{category}</BadgeEl>}
               </div>
               <h1 className="text-3xl font-black tracking-tight leading-tight">
                 {product.name}
               </h1>
            </div>

            {/* Galeria */}
            <section className="relative group">
              {images.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {images.map((img, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-square sm:aspect-[4/3] bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center p-6 md:p-12 overflow-hidden shadow-2xl">
                          <img
                            src={getOptimizedImageUrl(img, 1000, 85) || img}
                            alt={`${product.name} ${i + 1}`}
                            loading={i === 0 ? "eager" : "lazy"}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {images.length > 1 && (
                     <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                       <CarouselPrevious className="relative left-0 pointer-events-auto bg-black/50 backdrop-blur-md border-white/10 text-white h-12 w-12 rounded-2xl" />
                       <CarouselNext className="relative right-0 pointer-events-auto bg-black/50 backdrop-blur-md border-white/10 text-white h-12 w-12 rounded-2xl" />
                     </div>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-square sm:aspect-[4/3] bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center text-white/5 shadow-inner">
                  {product._type === "bike" ? <Bike size={120} strokeWidth={0.5} /> : <Package size={120} strokeWidth={0.5} />}
                </div>
              )}
            </section>

          </div>

          {/* LADO DIREITO: INFO, PREÇO, ACTION */}
          <div className="flex flex-col gap-8 md:gap-10">
            
            {/* Título Desktop */}
            <div className="hidden lg:block space-y-4">
               <div className="flex gap-2">
                 <BadgeEl>SKU: {sku}</BadgeEl>
                 {category && <BadgeEl>{category}</BadgeEl>}
               </div>
               <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1]">
                 {product.name}
               </h1>
            </div>

            {/* Preço */}
            <PriceSection product={product} />

            {/* CTA */}
            <section className="flex flex-col gap-4">
              <Btn 
                variant="primary" 
                className="w-full py-5 text-[15px] gap-2 shadow-[0_20px_40px_rgba(239,255,0,0.15)] active:scale-[0.98]"
                onClick={() => {
                  const price = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
                  useCart.getState().addItem(product, price);
                  import("sonner").then(({ toast }) => toast.success("Produto adicionado!", {
                    description: "Confira seu carrinho para finalizar.",
                    duration: 3000,
                  }));
                }}
              >
                <ShoppingBag size={20} /> Adicionar ao Carrinho
              </Btn>
              
              <Btn 
                variant="outline" 
                className="w-full py-4 text-sm font-bold tracking-wide uppercase bg-transparent"
                onClick={() => {
                  const whatsappUrl = `https://wa.me/5515996128054?text=${encodeURIComponent(`Olá, tenho interesse em ${product.name} (SKU: ${product.sku || ""})`)}`;
                  window.open(whatsappUrl, "_blank");
                }}
              >
                Falar com Especialista
              </Btn>
            </section>

            {/* Calculadora de Frete */}
            <ShippingSimulator 
              invoiceValue={Number(product.price_ecommerce) || Number(product.pix_price) || 0} 
              productType={product._type} 
            />

            {/* Descrição e Especificações juntas */}
            <section className="space-y-8 pt-10 border-t border-white/5">
              {/* Descrição */}
              {(product as any).description && (
                <div className="space-y-4 text-white/60 leading-relaxed text-[15px] whitespace-pre-line antialiased">
                  {(product as any).description}
                </div>
              )}

              {/* Especificações */}
              {((product._type === "bike" && bikeParts.length > 0) || attrs.length > 0 || specs.length > 0) && (
                <div className="space-y-5">
                  <h3 className="font-bold text-lg text-white/90">Especificações Técnicas</h3>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                    
                    {/* Lista de Specs e Atributos */}
                    {[...specs, ...attrs].map((s: any, idx: number) => (
                      <div key={`spec-${idx}`} className="flex items-center justify-between p-4 group/spec hover:bg-white/[0.02] transition-colors">
                        <span className="text-xs font-black uppercase tracking-widest text-white/30 group-hover/spec:text-white/50 transition-colors">{s.label || s.name}</span>
                        <span className="text-sm font-semibold text-white/80">{s.value}</span>
                      </div>
                    ))}

                    {/* Lista de Componentes da Bike */}
                    {product._type === "bike" && bikeParts.map((bp: any) => (
                      <div key={`bp-${bp.id}`} className="flex items-center justify-between p-4 group/spec hover:bg-white/[0.02] transition-colors">
                        <span className="text-xs font-black uppercase tracking-widest text-white/30 truncate max-w-[200px]">{bp.parts?.name || bp.part_name_override || "Componente"}</span>
                        <span className="text-[10px] font-black text-[#EFFF00] bg-[#EFFF00]/10 px-2 py-1 rounded-md">x{bp.quantity}</span>
                      </div>
                    ))}
                    
                  </div>
                </div>
              )}
            </section>

            {/* Garantia */}
            <section className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm group/card hover:bg-white/[0.05] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#EFFF00]/10 flex items-center justify-center text-[#EFFF00]">
                  <ShieldCheck size={20} />
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-white/90">Garantia</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/30">90 dias</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm group/card hover:bg-white/[0.05] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#0033FF]/10 flex items-center justify-center text-[#0033FF]">
                  <Truck size={20} />
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-white/90">Envio Seguro</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Brasil</span>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      <CartDrawer />
      <StoreChat />
    </div>
  );
}
