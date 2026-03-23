import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { type BikeModel } from "@/hooks/useBikes";

interface BatchQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bikes: BikeModel[];
}

export function BatchQRCodeModal({ open, onOpenChange, bikes }: BatchQRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;

    const qrItems = bikes.map(bike => {
      const productUrl = `${window.location.origin}/produto/${bike.sku}`;
      // Temporarily render to a hidden canvas to get data URL for each
      const canvas = document.createElement('canvas');
      return {
        sku: bike.sku,
        name: bike.name,
        url: productUrl
      };
    });

    win.document.write(`
      <html>
        <head>
          <title>Impressão em Lote - QR Codes</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0;
              padding: 20px;
              background: white;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 30px;
            }
            .qr-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 15px;
              border: 1px solid #eee;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .qr-code-placeholder {
              width: 150px;
              height: 150px;
              margin-bottom: 10px;
            }
            .sku {
              font-family: monospace;
              font-weight: bold;
              font-size: 14px;
              margin: 5px 0;
              letter-spacing: 0.1em;
            }
            .name {
              font-size: 11px;
              color: #666;
              text-align: center;
              max-width: 150px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${bikes.map(bike => `
              <div class="qr-item">
                <div id="qr-${bike.id}" class="qr-code-placeholder"></div>
                <div class="sku">${bike.sku}</div>
                <div class="name">${bike.name}</div>
              </div>
            `).join('')}
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            window.onload = function() {
              ${bikes.map(bike => `
                new QRCode(document.getElementById("qr-${bike.id}"), {
                  text: "${window.location.origin}/produto/${bike.sku}",
                  width: 150,
                  height: 150
                });
              `).join('')}
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    win.document.close();
  }, [bikes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Printer className="text-primary" />
            Preparar Impressão em Lote
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <p className="text-sm text-muted-foreground mb-4">
            Você selecionou <span className="text-white font-bold">{bikes.length}</span> modelos para impressão.
          </p>
          
          <div className="max-h-[300px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {bikes.map(bike => (
                <div key={bike.id} className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[150px]">{bike.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{bike.sku}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 py-6 rounded-2xl border-border" onClick={() => onOpenChange(false)}>
              <X size={18} className="mr-2" />
              Cancelar
            </Button>
            <Button className="flex-1 py-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold" onClick={handlePrint} disabled={bikes.length === 0}>
              <Printer size={18} className="mr-2" />
              Confirmar e Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
