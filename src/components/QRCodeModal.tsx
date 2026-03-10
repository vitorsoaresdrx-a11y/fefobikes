import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string;
  productName: string;
}

export function QRCodeModal({ open, onOpenChange, sku, productName }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const productUrl = `${window.location.origin}/produto/${sku}`;

  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sku}.png`;
    a.click();
  }, [sku]);

  const handlePrint = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>${sku}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;">
          <img src="${dataUrl}" width="256" height="256" />
          <p style="margin-top:16px;font-size:18px;font-weight:600;letter-spacing:0.05em;">${sku}</p>
          <p style="margin-top:4px;font-size:14px;color:#666;">${productName}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  }, [sku, productName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="p-4 bg-white rounded-lg">
            <QRCodeCanvas value={productUrl} size={200} level="H" />
          </div>
          <p className="text-sm font-mono font-semibold text-foreground tracking-widest">{sku}</p>
          <p className="text-xs text-muted-foreground text-center">{productName}</p>
          <div className="flex gap-2 w-full">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Baixar PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
