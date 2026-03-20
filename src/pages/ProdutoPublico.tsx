import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPartAttributes } from "@/hooks/usePartAttributes";
import { getOptimizedImageUrl } from "@/lib/image";
import {
  Bike,
  Package,
  ChevronRight,
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
    primary: "bg-primary text-white hover:bg-primary/80 shadow-[0_0_25px_rgba(41,82,255,0.3)]",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80 border border-border",
    outline: "border border-border bg-transparent text-foreground/80 hover:bg-muted",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 font-bold transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const BadgeEl = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
    {children}
  </span>
);

// ─── Header / Footer ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
          <Bike className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-sm text-white uppercase tracking-widest">Fefo Bikes</span>
      </div>
      <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground">
        <Package size={18} />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-border/50 bg-background flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 opacity-30">
        <Bike size={20} />
        <span className="text-[10px] font-black uppercase tracking-widest">Fefo Bikes © 2026</span>
      </div>
      <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">
        Consultoria Premium de Performance
      </p>
    </footer>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
          Preparando Experiência...
        </span>
      </div>
    </div>
  );
}

// ─── Price Section ────────────────────────────────────────────────────────────

function PriceSection({ product }: { product: any }) {
  const ecommercePrice = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
  const installmentsEnabledEcommerce = !!product.installments_enabled_ecommerce;
  const installmentCountEcommerce = Number(product.installment_count_ecommerce) || 0;
  const installmentValueEcommerce = Number(product.installment_value_ecommerce) || 0;
  // Fallback to legacy fields
  const installmentPrice = installmentsEnabledEcommerce ? installmentValueEcommerce : (Number(product.installment_price) || 0);
  const installmentCount = installmentsEnabledEcommerce ? installmentCountEcommerce : (Number(product.installment_count) || 1);
  const hasInstallments = installmentsEnabledEcommerce ? (installmentCountEcommerce > 1 && installmentValueEcommerce > 0) : (installmentPrice > 0 && installmentCount > 1);
  const hasAnyPrice = ecommercePrice > 0 || hasInstallments;

  if (!hasAnyPrice) return null;

  return (
    <section className="space-y-4">
      {ecommercePrice > 0 && (
        <div className="relative overflow-hidden p-8 rounded-[40px] bg-gradient-to-br from-secondary to-card border border-primary/30 shadow-[0_20px_50px_rgba(41,82,255,0.15)] text-center group">
          <div className="absolute -right-10 -top-10 opacity-[0.05] text-primary group-hover:rotate-12 transition-transform duration-700">
            <Zap size={200} />
          </div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">
            Valor à Vista
          </p>
          <p className="text-3xl lg:text-5xl font-black text-white tracking-tighter mb-2">
            {formatBRL(ecommercePrice)}
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" />
            Pagamento Seguro
          </div>
        </div>
      )}

      {hasInstallments && (
        <div className="p-6 bg-card border border-border rounded-[32px] flex items-center justify-between px-8 group hover:border-border/80 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-foreground/80 transition-colors">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No Cartão</p>
              <p className="text-sm font-bold text-foreground/90">
                Ou {installmentCount}x de{" "}
                <span className="text-white">{formatBRL(installmentPrice)}</span>
              </p>
            </div>
          </div>
          <div className="text-muted">
            <ChevronRight size={20} />
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Part Attributes Section ──────────────────────────────────────────────────

function PartAttributesSection({ partId }: { partId: string }) {
  const { data: attrs = [] } = usePublicPartAttributes(partId);
  if (attrs.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
        <List size={14} className="text-primary" /> Características
      </h2>
      <div className="bg-card border border-border rounded-[32px] overflow-hidden divide-y divide-border/50">
        {attrs.map((attr) => (
          <div
            key={attr.id}
            className="flex justify-between items-center p-5 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-sm font-bold text-muted-foreground">{attr.name}</span>
            <span className="text-sm font-black text-foreground">{attr.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ProdutoPublico() {
  const { sku } = useParams<{ sku: string }>();

  // Lógica real do Lovable — busca peça ou bike pelo SKU
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

  // Componentes da bike — lógica real do Lovable
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

  if (isLoading) return <LoadingState />;

  // Produto não encontrado
  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-background rounded-[32px] flex items-center justify-center text-muted-foreground/50">
            <Package size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Produto não encontrado</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Nenhum produto foi encontrado com este código.
            </p>
          </div>
          <Btn variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Btn>
        </div>
        <Footer />
      </div>
    );
  }

  // Produto oculto
  if (!product.visible_on_storefront) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-background rounded-[32px] flex items-center justify-center text-muted-foreground/50">
            <Package size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Produto Indisponível</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Este item não está disponível para visualização no momento.
            </p>
          </div>
          <Btn variant="outline" onClick={() => window.history.back()}>
            Voltar para Loja
          </Btn>
        </div>
        <Footer />
      </div>
    );
  }

  const images: string[] = (product as any).images || [];
  const category = product.category;

  // Specs — lógica real do Lovable (suporte a peça e bike)
  const specs: { label: string; value: string; icon: React.ReactNode }[] = [];
  if (product._type === "bike") {
    const b = product as any;
    if (b.brand) specs.push({ label: "Marca", value: b.brand, icon: <Info size={14} /> });
    if (b.frame_size) specs.push({ label: "Quadro", value: b.frame_size, icon: <Settings size={14} /> });
    if (b.rim_size) specs.push({ label: "Aro", value: b.rim_size, icon: <Settings size={14} /> });
    if (b.color) specs.push({ label: "Cor", value: b.color, icon: <Settings size={14} /> });
    if (b.weight_kg) specs.push({ label: "Peso", value: `${b.weight_kg} kg`, icon: <Info size={14} /> });
  } else {
    const p = product as any;
    if (p.material) specs.push({ label: "Material", value: p.material, icon: <Info size={14} /> });
    if (p.weight_capacity_kg) specs.push({ label: "Capacidade", value: `${p.weight_capacity_kg} kg`, icon: <Info size={14} /> });
    if (p.gears) specs.push({ label: "Marchas", value: p.gears, icon: <Settings size={14} /> });
    if (p.hub_style) specs.push({ label: "Cubo", value: p.hub_style, icon: <Settings size={14} /> });
    if (p.color) specs.push({ label: "Cor", value: p.color, icon: <Settings size={14} /> });
    if (p.rim_size) specs.push({ label: "Aro", value: p.rim_size, icon: <Settings size={14} /> });
    if (p.frame_size) specs.push({ label: "Quadro", value: p.frame_size, icon: <Settings size={14} /> });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-12">

        {/* Hero */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Catálogo Oficial
              </span>
              <div className="h-px flex-1 bg-muted/50" />
            </div>
            <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tighter leading-none">
              {product.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-lg bg-background border border-border text-[10px] font-mono text-muted-foreground">
              SKU: {sku}
            </div>
            {category && <BadgeEl>{category}</BadgeEl>}
          </div>
        </section>

        {/* Galeria */}
        <section className="relative">
          {images.length > 0 ? (
            <Carousel className="w-full group">
              <CarouselContent>
                {images.map((img, i) => (
                  <CarouselItem key={i}>
                    <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-card border border-border shadow-2xl">
                      <img
                        src={getOptimizedImageUrl(img, 800, 85) || img}
                        alt={`${product.name} ${i + 1}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <CarouselPrevious className="pointer-events-auto h-12 w-12 bg-black/50 border-none backdrop-blur-md text-white" />
                  <CarouselNext className="pointer-events-auto h-12 w-12 bg-black/50 border-none backdrop-blur-md text-white" />
                </div>
              )}
            </Carousel>
          ) : (
            <div className="aspect-[4/3] rounded-[40px] bg-card border border-border flex items-center justify-center text-muted relative overflow-hidden">
              {product._type === "bike" ? (
                <Bike size={80} strokeWidth={1} />
              ) : (
                <Package size={80} strokeWidth={1} />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
            </div>
          )}
        </section>

        {/* Preço */}
        <PriceSection product={product} />

        {/* Descrição */}
        {(product as any).description && (
          <section className="bg-card border border-border rounded-[32px] p-8 space-y-4">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Info size={14} className="text-primary" /> Sobre o Produto
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{(product as any).description}</p>
          </section>
        )}

        {/* Custom Attributes — only for parts */}
        {product._type === "part" && <PartAttributesSection partId={product.id} />}

        {/* Ficha Técnica */}
        {specs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">
              Ficha Técnica
            </h2>
            <div className="bg-card border border-border rounded-[32px] overflow-hidden divide-y divide-border/50">
              {specs.map((s, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground/70">{s.icon}</div>
                    <span className="text-sm font-bold text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="text-sm font-black text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Componentes da Bike — lógica real: bp.parts?.name || bp.part_name_override */}
        {product._type === "bike" && bikeParts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">
              Build & Componentes
            </h2>
            <div className="bg-card border border-border rounded-[32px] p-6 space-y-3">
              {bikeParts.map((bp: any) => (
                <div
                  key={bp.id}
                  className="flex items-center justify-between py-3 px-4 rounded-2xl bg-background/50 border border-border/50"
                >
                  <span className="text-xs font-bold text-foreground/80">
                    {bp.parts?.name || bp.part_name_override || "Peça"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-px w-8 bg-muted" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      ×{bp.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Selos */}
        <section className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-background/50 border border-border rounded-3xl flex flex-col items-center text-center space-y-2">
            <ShieldCheck className="text-emerald-500" size={24} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Garantia Fefo
            </span>
          </div>
          <div className="p-6 bg-background/50 border border-border rounded-3xl flex flex-col items-center text-center space-y-2">
            <Truck className="text-indigo-400" size={24} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Retirada Local
            </span>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="pt-10 space-y-4">
          <Btn 
            variant="primary" 
            className="w-full h-16 uppercase tracking-[0.2em] shadow-2xl flex gap-3"
            onClick={() => {
              const price = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
              useCart.getState().addItem(product, price);
              import("sonner").then(({ toast }) => toast.success("Adicionado ao carrinho!"));
            }}
          >
            <ShoppingBag size={20} /> Adicionar ao Carrinho
          </Btn>
          
          <button 
            className="w-full h-14 rounded-2xl border border-border bg-transparent text-muted-foreground font-black uppercase tracking-widest hover:bg-white/5 transition-all"
            onClick={() => {
              const whatsappUrl = `https://wa.me/5515996128054?text=${encodeURIComponent(`Olá, tenho interesse no produto ${product.name} (SKU: ${product.sku || ""})`)}`;
              window.open(whatsappUrl, "_blank");
            }}
          >
            Tenho Interesse <ArrowRight className="ml-2 w-4 h-4 inline" />
          </button>
        </section>
      </main>

      <Footer />
      <CartDrawer />
      <StoreChat />
    </div>
  );
}
