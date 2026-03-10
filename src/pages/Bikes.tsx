import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, QrCode, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useBikeModels,
  useBikePartsCount,
  useUpdateBikeModel,
  useDeleteBikeModel,
  type BikeModel,
} from "@/hooks/useBikes";
import { QRCodeModal } from "@/components/QRCodeModal";

export default function Bikes() {
  const { data: bikes = [], isLoading } = useBikeModels();
  const { data: partsCounts = {} } = useBikePartsCount();
  const updateBike = useUpdateBikeModel();
  const deleteBike = useDeleteBikeModel();
  const navigate = useNavigate();
  const [qrBike, setQrBike] = useState<BikeModel | null>(null);

  const handleToggle = (id: string, current: boolean) => {
    updateBike.mutate({ id, visible_on_storefront: !current });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Bikes</h1>
        <Button size="sm" onClick={() => navigate("/bikes/nova")} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Bike
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : bikes.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-sm text-muted-foreground">Nenhuma bike cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bikes.map((bike) => {
            const firstImage = (bike as any).images?.[0];
            return (
              <div
                key={bike.id}
                className="border border-border rounded-md bg-card hover:bg-accent/30 transition-colors cursor-pointer overflow-hidden"
                onClick={() => navigate(`/bikes/${bike.id}`)}
              >
                <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                  {firstImage ? (
                    <img src={firstImage} alt={bike.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground/20" />
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{bike.name}</h3>
                      {bike.sku && (
                        <p className="text-[10px] font-mono text-muted-foreground/70">{bike.sku}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bike.category || "Sem categoria"} · {partsCounts[bike.id] || 0} peças
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {bike.sku && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrBike(bike);
                          }}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBike.mutate(bike.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Visível na loja</span>
                    <Switch
                      checked={bike.visible_on_storefront}
                      onCheckedChange={() => handleToggle(bike.id, bike.visible_on_storefront)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
