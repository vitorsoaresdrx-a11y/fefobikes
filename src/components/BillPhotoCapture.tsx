import { useRef, useState } from "react";
import { X, Camera, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedBill } from "@/lib/barcode-parser";

interface BillPhotoCaptureProps {
  onExtracted: (data: ParsedBill) => void;
}

export function BillPhotoCapture({ onExtracted }: BillPhotoCaptureProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleExtract = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(photo);
      });

      const imageDataUrl = `data:${photo.type};base64,${base64}`;

      const { data, error: invokeError } = await supabase.functions.invoke("extract-bill-from-photo", {
        body: { imageDataUrl },
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Falha ao chamar extração por IA");
      }

      if (!data) {
        throw new Error("Sem resposta da IA");
      }

      onExtracted({
        type: data.type || "desconhecido",
        amount: typeof data.amount === "number" ? data.amount : null,
        due_date: data.due_date || null,
        bank_name: data.bank_name || null,
        beneficiary: data.beneficiary || null,
        barcode: data.barcode || "",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Extraction error:", msg, err);
      setError(`Falha: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-12 rounded-2xl bg-card border border-dashed border-border text-muted-foreground text-sm font-bold flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-all"
        >
          <Camera size={18} /> Tirar foto do boleto
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} className="w-full max-h-48 object-cover rounded-2xl" alt="Preview do boleto" />
            <button
              onClick={() => {
                setPhoto(null);
                setPreview(null);
                setError(null);
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white"
            >
              <X size={14} />
            </button>
          </div>

          <button
            onClick={handleExtract}
            disabled={loading}
            className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Extrair dados com IA
              </>
            )}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
