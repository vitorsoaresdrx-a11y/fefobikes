import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPartAttributes } from "@/hooks/usePartAttributes";
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
} from "lucide-react";
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
    primary: "bg-[#820AD1] text-white hover:bg-[#9D3BE1] shadow-[0_0_25px_rgba(130,10,209,0.3)]",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800",
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
  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#820AD1]/10 text-[#820AD1] border border-[#820AD1]/20">
    {children}
  </span>
);

// ─── Header / Footer ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-800/50 bg-[#0A0A0B]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#820AD1] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(130,10,209,0.3)]">
          <Bike className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-sm text-white uppercase tracking-widest">Fefo Bikes</span>
      </div>
      <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500">
        <Package size={18} />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-zinc-800/50 bg-[#0A0A0B] flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 opacity-30">
        <Bike size={20} />
        <span className="text-[10px] font-black uppercase tracking-widest">Fefo Bikes © 2024</span>
      </div>
      <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
        Consultoria Premium de Performance
      </p>
    </footer>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#820AD1] border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
          Preparando Experiência...
        </span>
      </div>
    </div>
  );
}

// ─── Price Section ────────────────────────────────────────────────────────────

function PriceSection({ product }: { product: any }) {
  const pixPrice = Number(product.pix_price) || 0;
  const installmentPrice = Number(product.installment_price) || 0;
  const installmentCount = Number(product.installment_count) || 1;
  const hasAnyPrice = pixPrice > 0 || installmentPrice > 0;

  if (!hasAnyPrice) return null;

  return (
    <section className="space-y-4">
      {pixPrice > 0 && (
        <div className="relative overflow-hidden p-8 rounded-[40px] bg-gradient-to-br from-[#1C1C1E] to-[#161618] border border-[#820AD1]/30 shadow-[0_20px_50px_rgba(130,10,209,0.15)] text-center group">
          <div className="absolute -right-10 -top-10 opacity-[0.05] text-[#820AD1] group-hover:rotate-12 transition-transform duration-700">
            <Zap size={200} />
          </div>
          <p className="text-[10px] font-bold text-[#820AD1] uppercase tracking-[0.3em] mb-2">
            Valor Especial PIX
          </p>
          <p className="text-3xl lg:text-5xl font-black text-white tracking-tighter mb-2">
            {formatBRL(pixPrice)}
          </p>
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" />
            Pagamento Seguro
          </div>
          <Btn variant="primary" className="w-full mt-8 h-14 uppercase tracking-widest">
            Tenho Interesse <ArrowRight className="ml-2 w-4 h-4" />
          </Btn>
        </div>
      )}

      {installmentPrice > 0 && installmentCount > 1 && (
        <div className="p-6 bg-[#161618] border border-zinc-800 rounded-[32px] flex items-center justify-between px-8 group hover:border-zinc-700 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No Cartão</p>
              <p className="text-sm font-bold text-zinc-200">
                Ou {installmentCount}x de{" "}
                <span className="text-white">{formatBRL(installmentPrice)}</span>
              </p>
            </div>
          </div>
          <div className="text-zinc-800">
            <ChevronRight size={20} />
          </div>
        </div>
      )}
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
      <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-900 rounded-[32px] flex items-center justify-center text-zinc-700">
            <Package size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Produto não encontrado</h2>
            <p className="text-zinc-500 text-sm max-w-xs">
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
      <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-900 rounded-[32px] flex items-center justify-center text-zinc-700">
            <Package size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Produto Indisponível</h2>
            <p className="text-zinc-500 text-sm max-w-xs">
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
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#820AD1]/30 flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-12">

        {/* Hero */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#820AD1]">
                Catálogo Oficial
              </span>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tighter leading-none">
              {product.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-500">
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
                    <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-[#161618] border border-zinc-800 shadow-2xl">
                      <img
                        src={img}
                        alt={`${product.name} ${i + 1}`}
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
            <div className="aspect-[4/3] rounded-[40px] bg-[#161618] border border-zinc-800 flex items-center justify-center text-zinc-800 relative overflow-hidden">
              {product._type === "bike" ? (
                <Bike size={80} strokeWidth={1} />
              ) : (
                <Package size={80} strokeWidth={1} />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1]/5 to-transparent opacity-50" />
            </div>
          )}
        </section>

        {/* Preço */}
        <PriceSection product={product} />

        {/* Descrição */}
        {(product as any).description && (
          <section className="bg-[#161618] border border-zinc-800 rounded-[32px] p-8 space-y-4">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Info size={14} className="text-[#820AD1]" /> Sobre o Produto
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">{(product as any).description}</p>
          </section>
        )}

        {/* Ficha Técnica */}
        {specs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
              Ficha Técnica
            </h2>
            <div className="bg-[#161618] border border-zinc-800 rounded-[32px] overflow-hidden divide-y divide-zinc-800/50">
              {specs.map((s, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-zinc-600">{s.icon}</div>
                    <span className="text-sm font-bold text-zinc-500">{s.label}</span>
                  </div>
                  <span className="text-sm font-black text-zinc-100">{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Componentes da Bike — lógica real: bp.parts?.name || bp.part_name_override */}
        {product._type === "bike" && bikeParts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
              Build & Componentes
            </h2>
            <div className="bg-[#161618] border border-zinc-800 rounded-[32px] p-6 space-y-3">
              {bikeParts.map((bp: any) => (
                <div
                  key={bp.id}
                  className="flex items-center justify-between py-3 px-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50"
                >
                  <span className="text-xs font-bold text-zinc-300">
                    {bp.parts?.name || bp.part_name_override || "Peça"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-px w-8 bg-zinc-800" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
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
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col items-center text-center space-y-2">
            <ShieldCheck className="text-emerald-500" size={24} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Garantia Fefo
            </span>
          </div>
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col items-center text-center space-y-2">
            <Truck className="text-indigo-400" size={24} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Retirada Local
            </span>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
