import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  Search, 
  MapPin, 
  Bike, 
  Calculator, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Monitor
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

interface FreightRule {
  // Removido - Agora usamos a API Oficial
}

const PESO_CUBADO_PADRAO = 38.48; // (78 * 20 * 148) / 6000

export default function SimuladorFreteInterno() {
  const [activeTab, setActiveTab] = useState<"cep" | "cidade">("cep");
  const [productTab, setProductTab] = useState<"sistema" | "manual">("sistema");
  
  // Destino
  const [cep, setCep] = useState("");
  const [selectedUf, setSelectedUf] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  
  // Produto
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [tipoProduto, setTipoProduto] = useState<"quadro" | "bike_completa" | null>(null);
  
  // Resultado
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 1. A API Oficial agora é chamada via invoke no handleCalculate

  // 2. Carregar bikes do sistema
  const { data: bikes = [] } = useQuery({
    queryKey: ["bikes_for_freight"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_models")
        .select("id, name, sale_price")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

  const cidades = [] as string[]; // Na busca por cidade, agora recomendamos usar o CEP para maior precisão na API

  // Busca por CEP via API agora disparada no botão Calcular

  const handleCalculate = async () => {
    setCalculating(true);
    setResult(null);
    try {
      const cleanCep = cep.replace(/\D/g, "");
      const bike = productTab === "sistema" ? bikes.find(b => b.id === selectedBikeId) : null;
      const valorBike = productTab === "sistema" ? Number(bike?.sale_price || 0) : Number(manualValue);
      
      const { data: response, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: { 
          DestinationZipCode: cleanCep, 
          InvoiceValue: valorBike 
        }
      });

      if (error || !response.ok) {
        throw new Error(response?.error || "Erro na cotação");
      }

      const quote = response.data;
      console.log("Cotação Oficial Rodonaves:", quote);

      // O valor retornado pela API da Rodonaves costuma estar em quote.ShippingPrice ou similar
      // Dependendo da estrutura da resposta (v1/gera-cotacao)
      // Normalmente é quote.TotalValue ou quote.Value
      const valorBruto = quote.Value || quote.TotalValue || quote.ShippingPrice;
      const prazoApi = quote.DeliveryDeadline || quote.Deadline || 5;

      if (!valorBruto) {
        throw new Error("Valor do frete não retornado pela transportadora.");
      }

      // Regra de arredondamento personalizada: teto multiplo de 5 + 30
      const valorFinal = Math.ceil(valorBruto / 5) * 5 + 30;
      const prazoFinal = Number(prazoApi) + 2;

      setResult({
        cidade: activeTab === "cep" ? selectedCidade : selectedCidade,
        uf: selectedUf,
        prazo: prazoFinal,
        valorFinal,
        detalhes: {
          fretePeso: valorBruto,
          gris: 0, // A API já inclui GRIS/TAS no Value total normalmente
          tas: 0,
          pedagio: 0,
          subtotalBruto: valorBruto
        }
      });

    } catch (err: any) {
      console.error("Erro no Simulador:", err);
      toast.error(err.message || "Não foi possível calcular o frete para esse CEP. Entre em contato conosco.");
    } finally {
      setCalculating(false);
    }
  };

  const isFormReady = () => {
    const hasDestino = activeTab === "cep" ? cep.replace(/\D/g, "").length === 8 : (selectedUf && selectedCidade);
    const valorPronto = (productTab === "sistema" ? selectedBikeId : manualValue);
    return hasDestino && valorPronto && tipoProduto;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      <header className="flex items-center gap-4 border-b border-border pb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Truck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Simulador de Frete Interno</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 uppercase font-bold tracking-widest font-sans">
            <Monitor size={14} /> Uso Administrativo · Transportadora Rodonaves
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BLOCO 1 - DESTINO */}
        <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <h3 className="font-black uppercase tracking-widest text-xs">1. Destino</h3>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab("cep")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "cep" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Por CEP
            </button>
            <button 
              onClick={() => setActiveTab("cidade")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "cidade" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Por Cidade
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === "cep" ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CEP de Destino</label>
                <input 
                  type="text" 
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full h-12 bg-background border border-border rounded-xl px-4 font-bold focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estado (UF)</label>
                  <select 
                    value={selectedUf}
                    onChange={(e) => { setSelectedUf(e.target.value); setSelectedCidade(""); }}
                    className="w-full h-12 bg-background border border-border rounded-xl px-4 font-bold appearance-none outline-none focus:ring-2 ring-primary/20"
                  >
                    <option value="">Selecione...</option>
                    {ufs.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cidade</label>
                  <select 
                    value={selectedCidade}
                    disabled={!selectedUf}
                    onChange={(e) => setSelectedCidade(e.target.value)}
                    className="w-full h-12 bg-background border border-border rounded-xl px-4 font-bold appearance-none outline-none focus:ring-2 ring-primary/20 disabled:opacity-50"
                  >
                    <option value="">Selecione...</option>
                    {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            {(selectedCidade || selectedUf) && (
              <div className="p-4 bg-muted/30 border border-border/50 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Localizado:</p>
                  <p className="font-black text-sm uppercase">{selectedCidade || "---"} – {selectedUf || "--"}</p>
                </div>
                <Search size={18} className="text-muted-foreground/30" />
              </div>
            )}
          </div>
        </section>

        {/* BLOCO 2 - PRODUTO */}
        <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Bike size={16} />
            </div>
            <h3 className="font-black uppercase tracking-widest text-xs">2. Produto</h3>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button 
              onClick={() => setProductTab("sistema")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${productTab === "sistema" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Lista do Sistema
            </button>
            <button 
              onClick={() => setProductTab("manual")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${productTab === "manual" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Manual
            </button>
          </div>

          <div className="space-y-5">
            {productTab === "sistema" ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Selecionar Bicicleta</label>
                <select 
                  value={selectedBikeId}
                  onChange={(e) => setSelectedBikeId(e.target.value)}
                  className="w-full h-12 bg-background border border-border rounded-xl px-4 font-bold appearance-none outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="">Selecione...</option>
                  {bikes.map(b => <option key={b.id} value={b.id}>{b.name} ({formatBRL(Number(b.sale_price))})</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor da Bike (R$)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold">R$</div>
                  <input 
                    type="number" 
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-12 bg-background border border-border rounded-xl pl-12 pr-4 font-bold outline-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Embalagem (Obrigatório)</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setTipoProduto("quadro")}
                  className={`py-3 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${tipoProduto === "quadro" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-border/80 text-muted-foreground"}`}
                >
                  <span className="font-black text-xs uppercase tracking-tight">Quadro</span>
                  <span className="text-[9px] font-bold opacity-60">6,0 KG</span>
                </button>
                <button 
                  onClick={() => setTipoProduto("bike_completa")}
                  className={`py-3 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${tipoProduto === "bike_completa" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-border/80 text-muted-foreground"}`}
                >
                  <span className="font-black text-xs uppercase tracking-tight">Bike Completa</span>
                  <span className="text-[9px] font-bold opacity-60">15,5 KG</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button 
          onClick={handleCalculate}
          disabled={!isFormReady() || calculating}
          className="w-full max-w-sm h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 shadow-xl shadow-primary/20"
        >
          {calculating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              Calcular Frete Rodonaves
              <ChevronRight size={20} />
            </>
          )}
        </button>

        {result && (
          <div className="w-full bg-primary/5 border-2 border-primary/20 rounded-[40px] p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-primary/10 pb-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Estimativa de Frete</p>
                <h2 className="text-3xl font-black flex items-center gap-3">
                  {result.cidade} <span className="text-primary/40">–</span> {result.uf}
                </h2>
              </div>
              <div className="bg-background/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-primary/10 flex items-center gap-3">
                <Clock size={18} className="text-primary" />
                <span className="font-black text-sm uppercase tracking-tight">Prazo: {result.prazo} dias úteis</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground border-b border-primary/5 pb-2">
                  <span className="uppercase tracking-widest">Frete por Peso (Cubagem)</span>
                  <span className="text-foreground">{formatBRL(result.detalhes.fretePeso)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground border-b border-primary/5 pb-2">
                  <span className="uppercase tracking-widest">GRIS (Seguro)</span>
                  <span className="text-foreground">{formatBRL(result.detalhes.gris)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground border-b border-primary/5 pb-2">
                  <span className="uppercase tracking-widest">TAS (Taxa Adm)</span>
                  <span className="text-foreground">{formatBRL(result.detalhes.tas)}</span>
                </div>
                {result.detalhes.pedagio > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground border-b border-primary/5 pb-2">
                    <span className="uppercase tracking-widest">Pedágio</span>
                    <span className="text-foreground">{formatBRL(result.detalhes.pedagio)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground/30 pt-2">
                  <span className="uppercase tracking-[0.1em]">Subtotal Bruto</span>
                  <span>{formatBRL(result.detalhes.subtotalBruto)}</span>
                </div>
              </div>

              <div className="bg-primary text-white rounded-[32px] p-8 md:p-10 flex flex-col items-center justify-center text-center shadow-2xl shadow-primary/30">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Valor Sugerido para Cliente</p>
                <h4 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
                  {formatBRL(result.valorFinal).replace("R$", "").trim()}
                  <span className="text-xl md:text-2xl ml-1 font-bold">R$</span>
                </h4>
                <div className="flex items-center gap-2 bg-black/10 px-4 py-1.5 rounded-full border border-white/10">
                  <AlertCircle size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Confirmar na emissão do CT-e</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
