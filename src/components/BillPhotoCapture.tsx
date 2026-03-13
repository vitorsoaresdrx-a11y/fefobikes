import { useRef, useState } from "react";
import { X, Camera, Sparkles, Loader2 } from "lucide-react";
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

      const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      if (!GROQ_API_KEY) throw new Error("Chave da API Groq não configurada");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-4-scout-17b-16e-instruct",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${photo.type};base64,${base64}`,
                  },
                },
                {
                  type: "text",
                  text: `Analise este boleto/conta e extraia as informações. Responda APENAS com JSON puro, sem texto adicional, sem markdown, sem crases: {"beneficiary": "nome do beneficiário ou empresa", "amount": 0.00, "due_date": "YYYY-MM-DD", "bank_name": "nome do banco se visível", "barcode": "código de barras numérico se visível", "type": "boleto ou concessionaria ou cartao"} Se algum campo não for encontrado, use null.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Groq API error:", response.status, errBody);
        throw new Error(`Erro da API: ${response.status}`);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Sem resposta da IA");

      // Clean markdown formatting
      const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const jsonStart = cleaned.search(/[{[]/);
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
        } else {
          throw new Error("Resposta inválida da IA");
        }
      }

      onExtracted({
        type: parsed.type || "desconhecido",
        amount: parsed.amount,
        due_date: parsed.due_date,
        bank_name: parsed.bank_name,
        beneficiary: parsed.beneficiary,
        barcode: parsed.barcode || "",
      });
    } catch (err) {
      console.error("Extraction error:", err);
      setError("Não foi possível extrair os dados. Tente uma foto mais nítida.");
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
              onClick={() => { setPhoto(null); setPreview(null); setError(null); }}
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
