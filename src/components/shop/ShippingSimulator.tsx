import { useState } from "react";
import { Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

interface ShippingSimulatorProps {
  invoiceValue: number;
  productType?: "bike" | "part";
  className?: string;
}

export function ShippingSimulator({ invoiceValue, productType = "bike", className = "" }: ShippingSimulatorProps) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async () => {
    const targetCep = cep.replace(/\D/g, "");

    if (targetCep.length !== 8) {
      toast.error("CEP inválido", {
        description: "Digite os 8 números do seu CEP."
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: {
          destinationZip: targetCep,
          invoiceValue: invoiceValue || 500,
          preset: productType === "bike" ? "bike_completa" : "quadro",
          quantidade: 1,
        }
      });

      if (error) throw error;
      if (!data.sucesso) throw new Error(data.error || "Região não atendida");

      setResult({
        cidade: data.cidade,
        uf: data.uf,
        prazo: data.prazoEntrega + 2,
        valor: data.valorFrete + 30,
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Falha no cálculo", {
        description: e.message || "Tente novamente em instantes."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-[#EFFF00]/[0.02] border-2 border-[#EFFF00]/10 p-6 sm:p-8 rounded-[32px] flex flex-col gap-6 transition-all duration-500 hover:border-[#EFFF00]/30 hover:bg-[#EFFF00]/[0.04] group shadow-2xl ${className}`}>
      
      {/* Background Decorative Element */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#EFFF00] opacity-[0.03] blur-[60px] pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#0033FF] opacity-[0.02] blur-[60px] pointer-events-none" />

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#EFFF00] text-black flex items-center justify-center shadow-[0_10px_20px_rgba(239,255,0,0.2)]">
          <Truck className="animate-pulse" size={24} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <h3 className="font-black text-white text-base tracking-tight leading-none mb-1">Cálculo de Entrega</h3>
          <span className="text-[10px] font-bold text-[#EFFF00] uppercase tracking-widest opacity-60">Rodonaves Transportadora</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        <div className="relative group/field">
          <input 
            type="text"
            placeholder="Digite seu CEP (00000-000)"
            value={cep}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCep(val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val);
              if (result) setResult(null);
            }}
            className="w-full bg-black border-2 border-white/5 rounded-2xl h-14 px-5 text-base font-bold text-white outline-none focus:border-[#EFFF00] focus:ring-4 focus:ring-[#EFFF00]/10 transition-all placeholder:text-white/20"
          />
        </div>

        <button 
          onClick={handleCalculate}
          disabled={loading || !cep}
          className="w-full h-14 bg-[#EFFF00] text-black hover:bg-white transition-all duration-300 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.97] disabled:opacity-20 shadow-[0_15px_35px_rgba(239,255,0,0.2)] hover:shadow-[0_20px_45px_rgba(239,255,0,0.3)]"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-black/10 border-t-black rounded-full animate-spin" />
          ) : (
            "Calcular Frete"
          )}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="pt-6 mt-2 border-t border-[#EFFF00]/10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Valor da Entrega</span>
                   <span className="text-3xl font-black text-[#EFFF00] tracking-tighter drop-shadow-lg">{formatBRL(result.valor)}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Prazo Estimado</span>
                   <div className="flex items-center gap-2">
                     <span className="text-lg font-black text-white">{result.prazo} dias</span>
                     <span className="text-[10px] font-bold text-white/40 uppercase">úteis</span>
                   </div>
                </div>
              </div>
              
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-bold text-white/50 text-center uppercase tracking-widest">
                   Enviando para <span className="text-white">{result.cidade} — {result.uf}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
