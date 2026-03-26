import { useState } from "react";
import { Truck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

const STATES = [
  { v: "AC", n: "Acre" }, { v: "AL", n: "Alagoas" }, { v: "AP", n: "Amapá" }, { v: "AM", n: "Amazonas" },
  { v: "BA", n: "Bahia" }, { v: "CE", n: "Ceará" }, { v: "DF", n: "Distrito Federal" }, { v: "ES", n: "Espírito Santo" },
  { v: "GO", n: "Goiás" }, { v: "MA", n: "Maranhão" }, { v: "MT", n: "Mato Grosso" }, { v: "MS", n: "Mato Grosso do Sul" },
  { v: "MG", n: "Minas Gerais" }, { v: "PA", n: "Pará" }, { v: "PB", n: "Paraíba" }, { v: "PR", n: "Paraná" },
  { v: "PE", n: "Pernambuco" }, { v: "PI", n: "Piauí" }, { v: "RJ", n: "Rio de Janeiro" }, { v: "RN", n: "Rio Grande do Norte" },
  { v: "RS", n: "Rio Grande do Sul" }, { v: "RO", n: "Rondônia" }, { v: "RR", n: "Roraima" }, { v: "SC", n: "Santa Catarina" },
  { v: "SP", n: "São Paulo" }, { v: "SE", n: "Sergipe" }, { v: "TO", n: "Tocantins" }
];

interface ShippingSimulatorProps {
  invoiceValue: number;
  productType?: "bike" | "part";
  className?: string;
}

export function ShippingSimulator({ invoiceValue, productType = "bike", className = "" }: ShippingSimulatorProps) {
  const [method, setMethod] = useState<"cep" | "state">("cep");
  const [cep, setCep] = useState("");
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async () => {
    let targetCep = cep.replace(/\D/g, "");

    if (method === "state") {
      if (!uf || !city) {
        toast.error("Selecione o estado e digite a cidade");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${uf}/${city}/json/`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          targetCep = data[0].cep.replace(/\D/g, "");
        } else {
          throw new Error("Cidade não localizada");
        }
      } catch (e) {
        setLoading(false);
        toast.error("Não localizamos o CEP desta cidade. Tente usar o CEP direto.");
        return;
      }
    }

    if (targetCep.length !== 8) {
      toast.error("Digite um CEP válido");
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
      if (!data.sucesso) throw new Error(data.error);

      setResult({
        cidade: data.cidade,
        uf: data.uf,
        prazo: data.prazoEntrega + 2,
        valor: data.valorFrete + 30,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao calcular frete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white/[0.03] border border-white/5 p-6 rounded-[24px] flex flex-col gap-5 shadow-inner relative overflow-hidden group ${className}`}>
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#EFFF00] opacity-[0.02] blur-[40px] pointer-events-none group-hover:opacity-[0.05] transition-opacity" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <Truck className="text-[#EFFF00]" size={18} />
          <h3 className="font-bold text-sm tracking-tight">Calcular Entrega</h3>
        </div>
        <div className="flex bg-black p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => { setMethod("cep"); setResult(null); }}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${method === "cep" ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"}`}
          >
            CEP
          </button>
          <button 
            onClick={() => { setMethod("state"); setResult(null); }}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${method === "state" ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"}`}
          >
            UF
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {method === "cep" ? (
          <input 
            type="text"
            placeholder="00000-000"
            value={cep}
            onChange={e => setCep(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl h-11 px-4 text-sm font-semibold outline-none focus:border-[#EFFF00]/50 transition-all placeholder:text-white/20"
          />
        ) : (
          <div className="flex flex-col gap-2">
            <select 
              value={uf}
              onChange={e => setUf(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl h-11 px-4 text-sm font-semibold outline-none focus:border-[#EFFF00]/50 transition-all text-white appearance-none"
            >
              <option value="" className="bg-black">Estado (UF)</option>
              {STATES.map(s => <option key={s.v} value={s.v} className="bg-black text-xs">{s.n}</option>)}
            </select>
            <input 
              type="text"
              placeholder="Digite a Cidade"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl h-11 px-4 text-sm font-semibold outline-none focus:border-[#EFFF00]/50 transition-all placeholder:text-white/20"
            />
          </div>
        )}

        <button 
          onClick={handleCalculate}
          disabled={loading}
          className="w-full h-11 bg-white/5 hover:bg-[#EFFF00] hover:text-black border border-white/10 hover:border-transparent transition-all rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/10 border-t-[#EFFF00] rounded-full animate-spin" /> : "Calcular Frete"}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 mt-2 border-t border-white/5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Custo de Entrega</span>
               <span className="text-xl font-black text-[#EFFF00] tracking-tighter">{formatBRL(result.valor)}</span>
            </div>
            <div className="text-right">
               <span className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Est. de Entrega</span>
               <p className="text-xs font-bold text-white">{result.prazo} dias úteis</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
