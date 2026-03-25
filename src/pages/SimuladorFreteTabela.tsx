import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  MapPin, 
  Package, 
  Bike, 
  CheckCircle2, 
  Share2,
  Calculator,
  Clock,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

const SimuladorFreteTabela = () => {
  const [cep, setCep] = useState("");
  const [bikeValue, setBikeValue] = useState("");
  const [tipoProduto, setTipoProduto] = useState<"quadro" | "bike_completa" | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async () => {
    if (!cep || !bikeValue || !tipoProduto) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setCalculating(true);
    const cleanCep = parseInt(cep.replace(/\D/g, ""));

    try {
      const { data, error } = await supabase
        .from("frete_tabela_rodonaves")
        .select("*")
        .lte("cep_ini", cleanCep)
        .gte("cep_fim", cleanCep)
        .single();

      if (error || !data) {
        toast.error("CEP não localizado na nossa tabela de frete.");
        return;
      }

      const rule = data as FreightRule;
      const value = parseFloat(bikeValue);
      
      // Lógica de cálculo automatizada
      const weight = tipoProduto === "quadro" ? 6 : 15.5;
      const basePrice = tipoProduto === "quadro" ? Number(rule.peso10) : Number(rule.peso20);
      
      // Taxas
      const gris = Math.max(Number(rule.gris_min), value * Number(rule.gris_pct));
      const tas = Number(rule.tas);
      const pedagio = Number(rule.pedagio_fixo); // Fração de 100kg (6kg e 15kg caem na primeira faixa)
      
      const subtotal = basePrice + gris + tas + pedagio;
      const valorFinal = Math.ceil(subtotal);

      setResult({
        cidade: rule.cidade,
        uf: rule.uf,
        prazo: rule.prazo,
        valorFinal,
        produto: tipoProduto === "quadro" ? "Quadro (Box)" : "Bike Completa",
        detalhes: {
          origem: "Sorocaba / SP",
          destino: `${rule.cidade} / ${rule.uf}`,
          valorBike: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        }
      });

      toast.success("Frete calculado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao realizar o cálculo.");
    } finally {
      setCalculating(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!result) return;

    const text = `*COTAÇÃO DE FRETE - FEFO BIKES* 🚲
-------------------------
📍 *Origem:* Sorocaba / SP
🏁 *Destino:* ${result.cidade} / ${result.uf}
📦 *Produto:* ${result.produto}
💰 *Valor do Bem:* ${result.detalhes.valorBike}
-------------------------
🕒 *Prazo:* ${result.prazo} Dias úteis
💵 *VALOR DO FRETE:* R$ ${result.valorFinal.toFixed(2)}
-------------------------
_Cotação baseada na Tabela Rodonaves 2024._`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Simulador de Frete</h1>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Consulta Instantânea via Tabela Rodonaves</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* INPUT CARD */}
        <Card className="p-6 border-2 border-border/50 bg-background/50 backdrop-blur-sm rounded-[32px] space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Destino (CEP)</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="pl-12 h-14 rounded-2xl font-black text-lg border-2 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor para Seguro (R$)</Label>
              <div className="relative">
                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  type="number"
                  placeholder="3.500,00"
                  value={bikeValue}
                  onChange={(e) => setBikeValue(e.target.value)}
                  className="pl-12 h-14 rounded-2xl font-black text-lg border-2 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Volume</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTipoProduto("quadro")}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all gap-2 h-28 ${tipoProduto === "quadro" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  <Package size={24} className={tipoProduto === "quadro" ? "animate-pulse" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Quadro (6kg)</span>
                </button>
                <button
                  onClick={() => setTipoProduto("bike_completa")}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all gap-2 h-28 ${tipoProduto === "bike_completa" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  <Bike size={24} className={tipoProduto === "bike_completa" ? "animate-pulse" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Bike Completa</span>
                </button>
              </div>
            </div>
          </div>

          <Button 
            disabled={calculating || !cep || !bikeValue || !tipoProduto}
            onClick={handleCalculate}
            className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-base gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {calculating ? <ArrowRight className="animate-spin" /> : <Calculator size={20} />}
            Calcular Frete
          </Button>
        </Card>

        {/* RESULT CARD */}
        <div className="relative">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-[32px] opacity-40">
              <Truck size={48} className="mb-4" />
              <p className="font-bold uppercase text-[10px] tracking-widest">Os resultados aparecerão aqui</p>
            </div>
          ) : (
            <Card className="p-8 border-2 border-primary/30 bg-primary/5 rounded-[40px] space-y-8 overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cotação Local</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter leading-none">{result.cidade}</h2>
                  <span className="text-xl font-bold text-muted-foreground">{result.uf}</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="p-3 bg-background rounded-2xl shadow-sm border border-border">
                    <Clock size={24} className="text-primary" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-center justify-between p-6 bg-background/80 rounded-3xl border border-border shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tempo de Entrega</span>
                    <span className="text-3xl font-black tracking-tighter uppercase">{result.prazo} Dias úteis</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-8 bg-primary text-primary-foreground rounded-[35px] shadow-xl shadow-primary/30">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Valor Total do Frete</span>
                    <span className="text-5xl font-black tracking-tighter">R$ {result.valorFinal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleShareWhatsApp}
                variant="outline"
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest border-2 hover:bg-primary hover:text-primary-foreground transition-all gap-2"
              >
                <Share2 size={18} />
                Compartilhar via WhatsApp
              </Button>

              <div className="absolute -bottom-4 -right-4 opacity-5 rotate-12">
                <Truck size={200} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimuladorFreteTabela;
