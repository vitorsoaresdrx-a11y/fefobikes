import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  QrCode,
  Package,
  Eye,
  EyeOff,
  Bike,
  Search,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  useBikeModels,
  useBikePartsCount,
  useUpdateBikeModel,
  useDeleteBikeModel,
  type BikeModel,
} from "@/hooks/useBikes";
import { QRCodeModal } from "@/components/QRCodeModal";
import { getOptimizedImageUrl } from "@/lib/image";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}) => {
  const v = {
    primary: "bg-[#2952FF] text-white hover:bg-[#4A6FFF] shadow-[0_0_20px_rgba(41,82,255,0.2)]",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800",
    destructive: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  };
  const s = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 rounded-2xl text-base font-bold",
    icon: "h-9 w-9 flex items-center justify-center",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Badge = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "active";
}) => {
  const s =
    variant === "active"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-zinc-800 text-zinc-500 border-zinc-700";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s}`}>
      {children}
    </span>
  );
};

function StatCard({
  title,
  value,
  color = "text-white",
}: {
  title: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-2xl bg-[#161618] border border-zinc-800">
      <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 leading-tight mb-1">{title}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-24 flex flex-col items-center text-center space-y-6 bg-[#161618] border border-dashed border-zinc-800 rounded-[40px]">
      <div className="w-20 h-20 bg-zinc-900 rounded-[30px] flex items-center justify-center text-zinc-700">
        <Bike size={40} />
      </div>
      <div className="space-y-2">
        <h4 className="text-xl font-bold text-zinc-300">Nenhuma bike no catálogo</h4>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
          Comece adicionando modelos de bicicletas para gerenciar peças e visibilidade.
        </p>
      </div>
      <Btn variant="outline" className="rounded-2xl px-10" onClick={onNew}>
        Cadastrar Primeiro Modelo
      </Btn>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Bikes() {
  const { data: bikes = [], isLoading } = useBikeModels();
  const { data: partsCounts = {} } = useBikePartsCount();
  const updateBike = useUpdateBikeModel();
  const deleteBike = useDeleteBikeModel();
  const navigate = useNavigate();
  const [qrBike, setQrBike] = useState<BikeModel | null>(null);
  const [search, setSearch] = useState("");

  const handleToggle = (id: string, current: boolean) => {
    updateBike.mutate({ id, visible_on_storefront: !current });
  };

  const debouncedSearch = useDebounce(search, 300);
  const filtered = bikes.filter(
    (b) =>
      b.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (b.category || "").toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const totalParts = Object.values(partsCounts as Record<string, number>).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-4">

        {/* Header Mobile */}
        <header className="flex items-center justify-between mb-4 md:hidden">
          <h1 className="text-lg font-black">Modelos de Bikes</h1>
          <button 
            className="h-9 px-3 text-xs font-bold rounded-xl bg-[#2952FF] text-white whitespace-nowrap flex items-center gap-1.5 shrink-0"
            onClick={() => navigate("/bikes/nova")}
          >
            <Plus size={14} />
            Nova Bike
          </button>
        </header>

        {/* Header Desktop */}
        <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#2952FF]">CATÁLOGO</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Modelos de Bikes</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-[#161618] border border-zinc-800 rounded-2xl px-4 py-2 text-zinc-500 focus-within:border-[#2952FF]/50 transition-colors">
              <Search className="w-4 h-4 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-zinc-200 w-48 placeholder:text-zinc-600"
              />
            </div>
            <Btn variant="primary" size="lg" onClick={() => navigate("/bikes/nova")}>
              <Plus className="w-5 h-5 mr-2 stroke-[3]" />
              Nova Bike
            </Btn>
          </div>
        </header>

        {/* Stats Mobile */}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          <StatCard title="Total de Modelos" value={bikes.length} />
          <StatCard
            title="Visíveis na Loja"
            value={bikes.filter((b) => b.visible_on_storefront).length}
            color="text-emerald-400"
          />
          <StatCard
            title="Total de Peças"
            value={totalParts}
            color="text-[#2952FF]"
          />
        </div>

        {/* Stats Desktop */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          <StatCard title="Total de Modelos" value={bikes.length} />
          <StatCard
            title="Visíveis na Loja"
            value={bikes.filter((b) => b.visible_on_storefront).length}
            color="text-emerald-400"
          />
          <StatCard
            title="Total de Peças"
            value={totalParts}
            color="text-[#2952FF]"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#2952FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 && search === "" ? (
          <EmptyState onNew={() => navigate("/bikes/nova")} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 text-sm">
            Nenhum resultado para "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filtered.map((bike) => {
              const firstImage = (bike as any).images?.[0];
              return (
                <div
                  key={bike.id}
                  className="group relative bg-[#161618] border border-zinc-800 rounded-[40px] overflow-hidden hover:border-[#2952FF]/50 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] cursor-pointer"
                  onClick={() => navigate(`/bikes/${bike.id}`)}
                >
                  {/* Imagem */}
                  <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-transparent to-transparent z-10" />
                    <div className="absolute top-4 right-4 z-20">
                      <Badge variant={bike.visible_on_storefront ? "active" : "default"}>
                        {bike.visible_on_storefront ? "NO AR" : "OCULTO"}
                      </Badge>
                    </div>

                    <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                      {firstImage ? (
                        <img src={getOptimizedImageUrl(firstImage, 400, 80) || firstImage} alt={bike.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-16 h-16 text-zinc-800" />
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 z-30 transition-all backdrop-blur-sm bg-black/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bike.sku && (
                        <Btn
                          variant="secondary"
                          size="icon"
                          className="rounded-2xl w-12 h-12 shadow-2xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrBike(bike);
                          }}
                        >
                          <QrCode className="w-5 h-5" />
                        </Btn>
                      )}
                      <Btn
                        variant="primary"
                        size="icon"
                        className="rounded-2xl w-12 h-12 shadow-2xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bikes/${bike.id}`);
                        }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Btn>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-8 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-black text-white truncate pr-2">{bike.name}</h3>
                        <button
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBike.mutate(bike.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#2952FF] uppercase tracking-[0.2em]">
                          {bike.category || "Sem categoria"}
                        </span>
                        {bike.sku && (
                          <>
                            <span className="text-zinc-700">•</span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{bike.sku}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-xs font-bold text-zinc-400">
                          {(partsCounts as Record<string, number>)[bike.id] || 0} Peças
                        </span>
                      </div>

                      <button
                        className="flex items-center gap-2 group/toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(bike.id, bike.visible_on_storefront);
                        }}
                      >
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider group-hover/toggle:text-zinc-300 transition-colors">
                          {bike.visible_on_storefront ? "Desativar" : "Ativar"}
                        </span>
                        {bike.visible_on_storefront ? (
                          <Eye className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-zinc-700" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modal — lógica original do Lovable */}
      {qrBike?.sku && (
        <QRCodeModal
          open={!!qrBike}
          onOpenChange={(open) => !open && setQrBike(null)}
          sku={qrBike.sku}
          productName={qrBike.name}
        />
      )}
    </div>
  );
}
