import { useRef, useState, useEffect } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { X, ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  onScanned: (code: string) => void;
}

export function BarcodeScanner({ onScanned }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const stopScan = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const startScan = async () => {
    if (scanning) return;
    try {
      setScanning(true);
      setError(null);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.ITF,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODABAR,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      readerRef.current = new BrowserMultiFormatReader(hints);

      readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, _err) => {
          if (result) {
            const text = result.getText();
            if (text) {
              onScanned(text);
              stopScan();
            }
          }
        }
      );
    } catch {
      setError("Não foi possível acessar a câmera.");
      stopScan();
    }
  };

  return (
    <div className="space-y-3">
      {scanning ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-16 border-2 border-primary rounded-xl opacity-80 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-xl" />
            </div>
          </div>
          <button
            onClick={stopScan}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/50 flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={startScan}
          className="w-full h-12 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
        >
          <ScanLine size={18} /> Escanear código de barras
        </button>
      )}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
