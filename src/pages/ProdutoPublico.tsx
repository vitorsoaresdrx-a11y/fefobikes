import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProdutoPublico() {
  const { sku } = useParams<{ sku: string }>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["public-product", sku],
    enabled: !!sku,
    queryFn: async () => {
      // Try parts first
      const { data: part } = await supabase
        .from("parts")
        .select("*")
        .eq("sku", sku!)
        .maybeSingle();
      if (part) return { ...part, _type: "part" as const };

      // Try bikes
      const { data: bike } = await supabase
        .from("bike_models")
        .select("*")
        .eq("sku", sku!)
        .maybeSingle();
      if (bike) return { ...bike, _type: "bike" as const };

      return null;
    },
  });

  // Fetch bike parts if it's a bike
  const { data: bikeParts = [] } = useQuery({
    queryKey: ["public-bike-parts", product?.id],
    enabled: !!product && product._type === "bike",
    queryFn: async () => {
      const { data } = await supabase
        .from("bike_model_parts")
        .select("*, parts(name)")
        .eq("bike_model_id", product!.id)
        .order("sort_order");
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">Produto não encontrado</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product.visible_on_storefront) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-foreground font-medium">Produto não disponível</p>
            <p className="text-muted-foreground text-sm">Este produto não está disponível no momento.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images: string[] = (product as any).images || [];
  const salePrice = Number((product as any).sale_price) || 0;
  const category = product.category;

  // Build specs
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{product.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{sku}</span>
            {category && <Badge variant="secondary" className="text-xs">{category}</Badge>}
          </div>
        </div>

        {/* Gallery */}
        {images.length > 0 ? (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((img, i) => (
                  <CarouselItem key={i}>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-card border border-border">
                      <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          </div>
        ) : (
          <div className="aspect-[4/3] rounded-lg bg-card border border-border flex items-center justify-center">
            {product._type === "bike" ? (
              <Bike className="h-16 w-16 text-muted-foreground/20" />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground/20" />
            )}
          </div>
        )}

        {/* Description */}
        {(product as any).description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{(product as any).description}</p>
        )}

        {/* Specs */}
        {specs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Especificações</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs text-foreground font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bike parts list */}
        {product._type === "bike" && bikeParts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Componentes</h2>
            <div className="space-y-1">
              {bikeParts.map((bp: any) => (
                <div key={bp.id} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-xs text-foreground">
                    {bp.parts?.name || bp.part_name_override || "Peça"}
                  </span>
                  <span className="text-xs text-muted-foreground">×{bp.quantity}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Price */}
        {(() => {
          const pixPrice = Number((product as any).pix_price) || 0;
          const installmentPrice = Number((product as any).installment_price) || 0;
          const installmentCount = Number((product as any).installment_count) || 1;
          const hasAnyPrice = salePrice > 0 || pixPrice > 0 || installmentPrice > 0;

          if (!hasAnyPrice) return null;

          return (
            <section className="py-4 space-y-3">
              {salePrice > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Preço</p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{formatBRL(salePrice)}</p>
                </div>
              )}
              {pixPrice > 0 && (
                <div className="p-3 rounded-md border border-primary/20 bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-0.5">No PIX / Dinheiro</p>
                  <p className="text-xl font-bold text-primary tracking-tight">{formatBRL(pixPrice)}</p>
                </div>
              )}
              {installmentPrice > 0 && installmentCount > 1 && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    ou <span className="text-sm font-semibold text-foreground">{installmentCount}x de {formatBRL(installmentPrice)}</span> no cartão
                  </p>
                </div>
              )}
            </section>
          );
        })()}
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="h-14 flex items-center px-4 border-b border-border/50">
      <div className="flex items-center gap-2">
        <Bike className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm text-foreground tracking-tight">Fefo Bikes</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="h-12 flex items-center justify-center border-t border-border/50">
      <span className="text-xs text-muted-foreground">Fefo Bikes</span>
    </footer>
  );
}
