import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  MapPin, 
  Search, 
  Package, 
  Bike, 
  CheckCircle2, 
  AlertCircle,
  Calculator
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface FreightRule {
  cep_ini: number;
  cep_fim: number;
  cidade: string;
  uf: string;
  prazo: number;
  peso5: number;
  peso10: number;
  peso20: number;
  peso40: number;
  peso60: number;
  peso100: number;
  excedente_kg: number;
  gris_min: number;
  gris_pct: number;
  tas: number;
  pedagio_fixo: number;
  pedagio_fracao_kg: number;
}

const PESO_CUBADO_PADRAO = 38.48; // (78 * 20 * 148) / 6000

const SimuladorFreteInterno = () => {
  // Estados de Busca
  const [activeTab, setActiveTab] = useState<"cep" | "cidade">("cep");
  const [cep, setCep] = useState("");
  const [selectedUf, setSelectedUf] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  
  // Estados de Produto
  const [productTab, setProductTab] = useState<"sistema" | "manual">("sistema");
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [tipoProduto, setTipoProduto] = useState<"quadro" | "bike_completa" | null>(null);

  // Estados de Resultado
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 1. Carregar dados do JSON (Cache via React Query)
  const { data: rawData = [] as FreightRule[], isLoading: loadingJson } = useQuery({
    queryKey: ["freight_rodonaves_json_v2"],
    queryFn: async () => {
      const res = await fetch("/frete_rodonaves.json");
      if (!res.ok) throw new Error("Falha ao carregar tabela de frete.");
      return res.json();
    },
    staleTime: Infinity,
  });

  // 2. Carregar bikes do sistema
  const { data: bikes = [] } = useQuery({
    queryKey: ["bikes_frete"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_models")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  // UFs Únicas para o Dropdown
  const ufs = useMemo(() => {
    const set = new Set(rawData.map(r => r.uf));
    return (Array.from(set).sort() as string[]);
  }, [rawData]);

  // Cidades filtradas por UF
  const cidadesFiltradas = useMemo(() => {
    if (!selectedUf) return ([] as string[]);
    const filtered = rawData.filter(r => r.uf === selectedUf);
    const set = new Set(filtered.map(r => r.cidade));
    return (Array.from(set).sort() as string[]);
  }, [selectedUf, rawData]);

  // Busca automática ao digitar CEP
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, "");
    if (activeTab === "cep" && cleanCep.length === 8) {
      const cepNum = parseInt(cleanCep);
      const rule = rawData.find(r => cepNum >= r.cep_ini && cepNum <= r.cep_fim);
      if (rule) {
        setSelectedCidade(rule.cidade);
        setSelectedUf(rule.uf);
      } else {
        toast.error("CEP não localizado na nossa base.");
      }
    }
  }, [cep, activeTab, rawData]);

  // Auto-detectar tipo de bike do sistema
  useEffect(() => {
    if (productTab === "sistema" && selectedBikeId) {
      const bike = bikes.find(b => b.id === selectedBikeId);
      if (bike?.tipo) {
        setTipoProduto(bike.tipo as any);
      } else {
        setTipoProduto(null);
      }
    }
  }, [selectedBikeId, productTab, bikes]);

  const handleCalculate = async () => {
    setCalculating(true);
    setResult(null);

    try {
      const bike = productTab === "sistema" ? bikes.find(b => b.id === selectedBikeId) : null;
      const valorBike = productTab === "sistema" ? Number(bike?.sale_price || 0) : Number(manualValue);
      
      const cleanCep = cep.replace(/\D/g, "");
      
      const payload = {
        destinationZip: cleanCep,
        invoiceValue: valorBike,
        preset: tipoProduto,
        quantidade: 1, // Por enquanto 1, mas pode ser expansível
        // originZip e customerTaxId são resolvidos no backend via env
      };

      const { data, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: payload
      });

      if (error) {
        let errorMsg = "Erro na cotação";
        try {
          // Capturar o JSON de erro retornado pela Edge Function
          const errorJson = await (error as any).context?.json();
          errorMsg = errorJson?.error || error.message;
        } catch (e) {
          errorMsg = error.message;
        }
        throw new Error(errorMsg);
      }
      
      if (!data.sucesso) throw new Error(data.error || "Erro na cotação");

      setResult({
        cidade: selectedCidade || "Destino",
        uf: selectedUf || "UF",
        prazo: data.prazoEntrega,
        valorFinal: data.valorFrete, // O valor retornado já é o final da API
        detalhes: {
          fretePeso: 0, // A API da Rodonaves já consolida os valores
          gris: 0,
          tas: 0,
          pedagio: 0,
          subtotalBruto: data.valorFrete
        }
      });

      toast.success("Cotação realizada com sucesso!");

    } catch (err: any) {
      console.error("Erro no cálculo de frete:", err);
      toast.error(err.message || "Não foi possível calcular o frete.");
    } finally {
      setCalculating(false);
    }
  };

  const isFormReady = () => {
    const hasDestino = activeTab === "cep" ? cep.replace(/\D/g, "").length === 8 : (selectedUf && selectedCidade);
    const hasValue = productTab === "sistema" ? !!selectedBikeId : (Number(manualValue) > 0);
    return hasDestino && hasValue && !!tipoProduto;
  };

  if (loadingJson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Carregando Tabelas de Frete...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      <header className="flex items-center gap-4 border-b border-border pb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
          <Truck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Simulador de Frete</h1>
          <p className="text-sm text-muted-foreground font-medium">Uso Interno — Rodonaves (Base Local)</p>
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

          {activeTab === "cep" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">CEP de Destino</Label>
                <Input 
                  value={cep} 
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                  className="rounded-xl font-bold h-12 px-4 focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Cidade</Label>
                  <Input value={selectedCidade} readOnly className="bg-muted border-none font-bold rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">UF</Label>
                  <Input value={selectedUf} readOnly className="bg-muted border-none font-bold rounded-xl h-12" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Estado (UF)</Label>
                <Select onValueChange={setSelectedUf} value={selectedUf}>
                  <SelectTrigger className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Selecione o Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ufs.map(uf => (
                      <SelectItem key={uf} value={uf} className="font-bold">{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Cidade</Label>
                <Select onValueChange={setSelectedCidade} value={selectedCidade} disabled={!selectedUf}>
                  <SelectTrigger className="h-12 rounded-xl font-bold uppercase">
                    <SelectValue placeholder="Selecione a Cidade" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {cidadesFiltradas.map(cidade => (
                      <SelectItem key={cidade} value={cidade} className="font-bold uppercase">{cidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </section>

        {/* BLOCO 2 - PRODUTO */}
        <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Package size={16} />
            </div>
            <h3 className="font-black uppercase tracking-widest text-xs">2. Produto</h3>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button 
              onClick={() => setProductTab("sistema")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${productTab === "sistema" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Sistema
            </button>
            <button 
              onClick={() => setProductTab("manual")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${productTab === "manual" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Manual
            </button>
          </div>

          <div className="space-y-4">
            {productTab === "sistema" ? (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Escolher Bike</Label>
                <Select onValueChange={setSelectedBikeId} value={selectedBikeId}>
                  <SelectTrigger className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Selecione uma bike" />
                  </SelectTrigger>
                  <SelectContent>
                    {bikes.map(bike => (
                      <SelectItem key={bike.id} value={bike.id} className="font-bold">
                        {bike.name} — R$ {Number(bike.sale_price).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Valor da Bike (R$)</Label>
                <Input 
                  type="number"
                  value={manualValue} 
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Ex: 5000"
                  className="rounded-xl font-bold h-12 px-4"
                />
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Tipo de Volume</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTipoProduto("quadro")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 h-24 ${tipoProduto === "quadro" ? "border-primary bg-primary/5 text-primary scale-[0.98]" : "border-border text-muted-foreground hover:border-border/80"}`}
                >
                  <Package size={20} className={tipoProduto === "quadro" ? "animate-bounce" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Quadro (6kg)</span>
                </button>
                <button
                  onClick={() => setTipoProduto("bike_completa")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 h-24 ${tipoProduto === "bike_completa" ? "border-primary bg-primary/5 text-primary scale-[0.98]" : "border-border text-muted-foreground hover:border-border/80"}`}
                >
                  <Bike size={20} className={tipoProduto === "bike_completa" ? "animate-bounce" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">Bike Completa (15,5kg)</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-center pt-4">
        <Button 
          disabled={!isFormReady() || calculating}
          onClick={handleCalculate}
          className="h-16 px-12 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-3 group"
        >
          {calculating ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Calculator size={20} className="group-hover:rotate-12 transition-transform" />
          )}
          Calcular Frete Oficial
        </Button>
      </div>

      {result && (
        <Card className="border-2 border-primary/20 bg-background rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 md:p-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cotação Garantida</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                  {result.cidade} — {result.uf}
                </h2>
              </div>
              <div className="flex flex-col md:items-end">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prazo Estimado</span>
                <span className="text-3xl md:text-4xl font-black text-primary tracking-tighter">
                  {result.prazo} <span className="text-xl">Dias úteis</span>
                </span>
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-6">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Frete Peso</p>
                  <p className="text-lg font-black tracking-tight">R$ {result.detalhes.fretePeso.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Taxa GRIS</p>
                  <p className="text-lg font-black tracking-tight">R$ {result.detalhes.gris.toFixed(2)}</p>
                </div>
                {result.detalhes.tas > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Taxa TAS</p>
                    <p className="text-lg font-black tracking-tight">R$ {result.detalhes.tas.toFixed(2)}</p>
                  </div>
                )}
                {result.detalhes.pedagio > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pedágio</p>
                    <p className="text-lg font-black tracking-tight">R$ {result.detalhes.pedagio.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-[30px] p-6 md:p-8 flex flex-col items-center md:items-end gap-1 shadow-inner min-w-[240px]">
                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">Valor Final Sugerido</span>
                <span className="text-5xl font-black text-primary tracking-tighter">
                  R$ {result.valorFinal.toLocaleString()}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-muted-foreground line-through">Subtotal: R$ {result.detalhes.subtotalBruto.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-muted/30 p-4 rounded-2xl border border-border/50">
              <AlertCircle size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-wider">
                Valor orçado com base no peso cubado padrão (38.48kg). Estimativa calculada via tabela Rodonaves 2024. 
                Sempre confirmar o valor final na emissão do CT-e.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SimuladorFreteInterno;
