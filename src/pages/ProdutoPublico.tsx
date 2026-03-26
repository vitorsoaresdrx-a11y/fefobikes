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
  Zap,
  ArrowRight,
  Info,
  Settings,
  CreditCard,
  List,
  ShoppingBag,
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
    primary: "bg-[#EFFF00] text-black border-2 border-[#EFFF00] hover:bg-black hover:text-[#EFFF00]",
    secondary: "bg-[#0033FF] text-white border-2 border-[#0033FF] hover:bg-black hover:text-[#0033FF]",
    outline: "border-2 border-white/20 bg-transparent text-white hover:border-white",
  };
  return (
    <button
      className={`inline-flex items-center justify-center px-8 py-4 font-['Syne'] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${v[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const BadgeEl = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-white/10 text-white border border-white/20">
    {children}
  </span>
);

// ─── Header / Footer ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b-2 border-white/10 px-4 md:px-8 py-4 h-20 md:h-24 flex items-center justify-between">
      <Link to="/store" className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-14 md:h-14 bg-[#EFFF00] text-black flex items-center justify-center hover:rotate-12 transition-transform">
          <Bike className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="font-['Syne'] font-extrabold text-xl md:text-3xl tracking-tighter uppercase leading-none text-white">FEFO BIKES</span>
          <span className="font-['Space_Grotesk'] font-bold text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-white/50">PERFORMANCE R.</span>
        </div>
      </Link>
      <div className="flex gap-4">
        <Link to="/store" className="hidden sm:flex h-12 px-6 border-2 border-white text-[10px] font-['Syne'] font-bold text-white hover:bg-white hover:text-black transition-colors items-center uppercase tracking-widest">
          VOLTAR À LOJA
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="w-full bg-black border-t-2 border-white/20 py-16 px-8 flex flex-col items-center justify-center gap-6 mt-20">
      <div className="font-['Syne'] font-black text-3xl md:text-5xl uppercase tracking-tighter text-white opacity-50">
        FEFO BIKES.
      </div>
      <p className="font-['Space_Grotesk'] text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-center">
        Engineered in Sorocaba. Não aceitamos o segundo lugar.
      </p>
    </footer>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-white/20 border-t-[#EFFF00] rounded-full animate-spin" />
        <span className="font-['Syne'] text-xs font-black uppercase tracking-[0.3em] animate-pulse">
          LOADING PERFORMANCE...
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
    <section className="space-y-4 border-l-4 border-[#0033FF] pl-6 md:pl-8 py-2">
      {ecommercePrice > 0 && (
        <div className="flex flex-col gap-1">
          <p className="font-['Space_Grotesk'] text-[10px] font-bold text-[#EFFF00] uppercase tracking-[0.3em]">
            PIX / Á VISTA
          </p>
          <p className="font-['Syne'] text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
            {formatBRL(ecommercePrice)}
          </p>
        </div>
      )}

      {hasInstallments && (
        <div className="pt-4 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 flex items-center justify-center text-white/50">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="font-['Space_Grotesk'] text-[10px] font-bold text-white/50 uppercase tracking-widest">Cartão de Crédito</p>
              <p className="font-['Space_Grotesk'] text-sm font-bold text-white">
                {installmentCount}x de {formatBRL(installmentPrice)}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ShippingSimulator() {
  const [cep, setCep] = useState("");
  return (
    <div className="border-2 border-white/20 p-6 md:p-8 space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#EFFF00]/5 -translate-y-1/2 translate-x-1/2 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center gap-3">
        <Truck className="text-[#0033FF]" size={28} strokeWidth={2.5}/>
        <h3 className="font-['Syne'] text-xl font-black uppercase tracking-tighter text-white">LOGÍSTICA / FRETE</h3>
      </div>
      <p className="font-['Space_Grotesk'] text-white/50 text-sm">
        Consulte prazos e valores de envio de alta performance para o seu CEP.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text"
          placeholder="00000-000"
          value={cep}
          onChange={e => setCep(e.target.value)}
          className="flex-1 bg-white/5 border-2 border-white/20 h-14 px-6 font-['Space_Grotesk'] font-bold text-white text-lg tracking-widest outline-none focus:border-[#EFFF00] transition-colors"
        />
        <Btn variant="primary" className="h-14 sm:w-auto w-full px-10 text-xs">Calcular</Btn>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen bg-black text-white font-['Space_Grotesk'] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
          <div className="w-32 h-32 border-2 border-white/10 flex items-center justify-center rotate-45">
            <Package size={48} className="-rotate-45 opacity-50" />
          </div>
          <div className="space-y-4">
            <h2 className="font-['Syne'] text-4xl md:text-6xl font-black uppercase tracking-tighter">OFFLINE</h2>
            <p className="text-white/50 max-w-sm mx-auto">
              Equipamento não localizado ou indisponível no momento.
            </p>
          </div>
          <Link to="/store">
            <Btn variant="primary">VOLTAR AO CATÁLOGO</Btn>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const images: string[] = (product as any).images || [];
  const category = product.category;

  const specs: { label: string; value: string; icon: React.ReactNode }[] = [];
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
    <div className="min-h-screen bg-black text-white font-['Space_Grotesk'] selection:bg-[#EFFF00] selection:text-black flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* LADO ESQUERDO: GALERIA E FICHA TÉCNICA */}
          <div className="w-full lg:w-[55%] space-y-12">
            
            {/* Titulo Mobile */}
            <div className="space-y-4 lg:hidden">
               <div className="flex gap-2">
                 <BadgeEl>{sku}</BadgeEl>
                 {category && <BadgeEl>{category}</BadgeEl>}
               </div>
               <h1 className="font-['Syne'] text-4xl font-black uppercase tracking-tighter leading-none">
                 {product.name}
               </h1>
            </div>

            {/* Galeria */}
            <section className="relative">
              {images.length > 0 ? (
                <Carousel className="w-full border-2 border-white/20 p-2 group">
                  <CarouselContent>
                    {images.map((img, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-square sm:aspect-[4/3] bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
                          <img
                            src={getOptimizedImageUrl(img, 1200, 85) || img}
                            alt={`${product.name} ${i + 1}`}
                            loading={i === 0 ? "eager" : "lazy"}
                            className="w-full h-full object-contain filter grayscale-[0.2] transition-transform duration-700 hover:scale-105"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {images.length > 1 && (
                     <div className="absolute bottom-6 right-6 flex gap-2">
                       <CarouselPrevious className="static transform-none bg-[#EFFF00] border-none text-black h-12 w-12 rounded-none hover:bg-white transition-colors" />
                       <CarouselNext className="static transform-none bg-[#EFFF00] border-none text-black h-12 w-12 rounded-none hover:bg-white transition-colors" />
                     </div>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-square sm:aspect-[4/3] border-2 border-white/20 flex items-center justify-center text-white/10 bg-[#0A0A0A]">
                  {product._type === "bike" ? <Bike size={120} strokeWidth={1} /> : <Package size={120} strokeWidth={1} />}
                </div>
              )}
            </section>

            {/* Descrição */}
            {(product as any).description && (
              <section className="space-y-6">
                <h2 className="font-['Syne'] text-3xl font-black uppercase tracking-tighter">Detalhes</h2>
                <p className="text-white/60 leading-relaxed font-['Space_Grotesk'] text-base md:text-lg whitespace-pre-line">
                  {(product as any).description}
                </p>
              </section>
            )}

          </div>

          {/* LADO DIREITO: INFO, PREÇO, ACTION */}
          <div className="w-full lg:w-[45%] flex flex-col gap-12">
            
            {/* Título Desktop */}
            <div className="hidden lg:block space-y-6">
               <div className="flex gap-2">
                 <BadgeEl>{sku}</BadgeEl>
                 {category && <BadgeEl>{category}</BadgeEl>}
               </div>
               <h1 className="font-['Syne'] text-5xl xl:text-7xl font-black uppercase tracking-tighter leading-none break-words">
                 {product.name}
               </h1>
            </div>

            {/* Preço */}
            <PriceSection product={product} />

            {/* CTA */}
            <section className="flex flex-col gap-4">
              <Btn 
                variant="primary" 
                className="w-full h-20 text-sm md:text-base flex justify-between items-center px-8"
                onClick={() => {
                  const price = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
                  useCart.getState().addItem(product, price);
                  import("sonner").then(({ toast }) => toast.success("ADICIONADO AO CARRINHO", {
                     style: { background: "#EFFF00", color: "#000", border: "2px solid #000" }
                  }));
                }}
              >
                <span>COMPRAR AGORA</span> <ArrowRight size={24} strokeWidth={3} />
              </Btn>
              
              <Btn 
                variant="outline" 
                className="w-full h-16 text-xs md:text-sm text-white/70"
                onClick={() => {
                  const whatsappUrl = `https://wa.me/5515996128054?text=${encodeURIComponent(`SALVE! TENHO INTERESSE NA PERFORMANCE DA ${product.name} (SKU: ${product.sku || ""})`)}`;
                  window.open(whatsappUrl, "_blank");
                }}
              >
                FALE COM ESPECIALISTA VIA WHATSAPP
              </Btn>
            </section>

            {/* Calculadora Frete */}
            <ShippingSimulator />

            {/* Componentes da Bike */}
            {product._type === "bike" && bikeParts.length > 0 && (
              <section className="space-y-6 pt-8 border-t-2 border-white/20">
                <h2 className="font-['Syne'] text-2xl font-black uppercase tracking-tighter text-[#0033FF]">
                  SPECS TÉCNICAS.
                </h2>
                <div className="flex flex-col border-2 border-white/20 divide-y-2 divide-white/10">
                  {bikeParts.map((bp: any) => (
                    <div key={bp.id} className="flex items-center justify-between p-4 group hover:bg-white/5 transition-colors">
                      <span className="font-bold text-white uppercase font-['Space_Grotesk'] text-sm">
                        {bp.parts?.name || bp.part_name_override || "PEÇA"}
                      </span>
                      <span className="font-['Syne'] font-black text-[#EFFF00]">
                        ×{bp.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Atributos Gerais */}
            {(attrs.length > 0 || specs.length > 0) && (
              <section className="space-y-6 pt-8 border-t-2 border-white/20">
                <h2 className="font-['Syne'] text-2xl font-black uppercase tracking-tighter">
                  INFORMAÇÕES.
                </h2>
                <div className="flex flex-col border-2 border-white/20 divide-y-2 divide-white/10">
                  {[...specs, ...attrs].map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      <span className="font-bold text-white/50 uppercase font-['Space_Grotesk'] text-xs tracking-widest">{s.label || s.name}</span>
                      <span className="font-bold text-white uppercase font-['Space_Grotesk'] text-sm tracking-widest">{s.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Garantia */}
            <section className="grid grid-cols-2 gap-4 pt-8">
              <div className="border-2 border-white/20 p-6 flex flex-col gap-4 text-white hover:border-[#EFFF00] transition-colors">
                <ShieldCheck size={32} className="text-[#EFFF00]" />
                <div>
                   <p className="font-['Syne'] font-black uppercase text-sm">Garantia Fefo</p>
                   <p className="font-['Space_Grotesk'] text-[10px] text-white/50 uppercase tracking-widest mt-1">90 DIAS ASSEGURADOS</p>
                </div>
              </div>
              <div className="border-2 border-white/20 p-6 flex flex-col gap-4 text-white hover:border-[#0033FF] transition-colors">
                <Truck size={32} className="text-[#0033FF]" />
                <div>
                   <p className="font-['Syne'] font-black uppercase text-sm">Logística</p>
                   <p className="font-['Space_Grotesk'] text-[10px] text-white/50 uppercase tracking-widest mt-1">RETIRADA OU ENVIO BRASIL</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer />
      <StoreChat />
    </div>
  );
}
