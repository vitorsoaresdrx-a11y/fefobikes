import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
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
  ClipboardList,
  Download,
  Image as ImageIcon
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
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
        setResult(null);
        return;
      }

      const rule = data as FreightRule;
      const value = parseFloat(bikeValue);
      
      const weight = tipoProduto === "quadro" ? 6 : 15.5;
      const basePrice = tipoProduto === "quadro" ? Number(rule.peso10) : Number(rule.peso20);
      const gris = Math.max(Number(rule.gris_min), value * Number(rule.gris_pct));
      const tas = Number(rule.tas);
      const pedagio = Number(rule.pedagio_fixo);
      
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
          valorBike: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          valorBikeNum: value
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

  const handleCaptureImage = async () => {
    if (!cardRef.current) return;
    
    setCapturing(true);
    try {
      // Ajuste para melhor qualidade
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#09090b", // Tema dark
        logging: false,
        useCORS: true
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Cote-Fefo-Bikes-${result.cidade}.png`;
      link.click();
      
      toast.success("Imagem gerada e baixada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar imagem.");
    } finally {
      setCapturing(false);
    }
  };

  const shareTextWhatsApp = () => {
    const text = `*COTAÇÃO FEFO BIKES* 🚲
Produto: ${result.produto}
Destino: ${result.cidade}/${result.uf}
Valor: R$ ${result.valorFinal.toFixed(2)}
Prazo: ${result.prazo} dias úteis`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20 pt-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-[20px] bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Cote na Tabela</h1>
            <p className="text-muted-foreground font-black uppercase text-[9px] tracking-[0.2em] mt-1 opacity-70">Logística Interna Fefo Bikes</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* INPUTS */}
        <div className="space-y-8">
          <Card className="p-8 border-2 border-border/50 bg-muted/20 backdrop-blur-xl rounded-[40px] space-y-8 shadow-inner">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Para Onde? (CEP)</Label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} />
                  <Input 
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="pl-12 h-16 rounded-[24px] font-black text-xl border-2 bg-background focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Valor do Produto (R$)</Label>
                <div className="relative group">
                  <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} />
                  <Input 
                    type="number"
                    placeholder="5.000"
                    value={bikeValue}
                    onChange={(e) => setBikeValue(e.target.value)}
                    className="pl-12 h-16 rounded-[24px] font-black text-xl border-2 bg-background focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">O que vamos enviar?</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTipoProduto("quadro")}
                    className={`flex flex-col items-center justify-center p-4 rounded-[28px] border-2 transition-all gap-2 h-32 ${tipoProduto === "quadro" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                  >
                    <Package size={28} className={tipoProduto === "quadro" ? "animate-pulse" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Apenas Quadro</span>
                  </button>
                  <button
                    onClick={() => setTipoProduto("bike_completa")}
                    className={`flex flex-col items-center justify-center p-4 rounded-[28px] border-2 transition-all gap-2 h-32 ${tipoProduto === "bike_completa" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                  >
                    <Bike size={28} className={tipoProduto === "bike_completa" ? "animate-pulse" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Bike Completa</span>
                  </button>
                </div>
              </div>
            </div>

            <Button 
              disabled={calculating || !cep || !bikeValue || !tipoProduto}
              onClick={handleCalculate}
              className="w-full h-16 rounded-[24px] font-black uppercase tracking-widest text-base gap-3 shadow-2xl shadow-primary/30 transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              <Calculator size={22} />
              Calcular Frete na Tabela
            </Button>
          </Card>
        </div>

        {/* OUTPUT PRETTY VIEW */}
        <div className="flex flex-col gap-6">
          {!result ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-4 border-dashed border-border/50 rounded-[50px] bg-muted/5 opacity-50">
              <div className="w-24 h-24 rounded-full bg-border/20 flex items-center justify-center mb-6">
                <Truck size={40} className="text-muted-foreground" />
              </div>
              <h3 className="font-black uppercase tracking-widest text-xs mb-2">Simulador Rodonaves Local</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest max-w-[200px]">Os preços e prazos oficiais aparecerão aqui após carregar os dados.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* THE CARD TO TAKE A SCREENSHOT OF */}
              <div 
                ref={cardRef}
                className="p-1 border-[6px] border-primary/20 rounded-[45px] bg-zinc-950 overflow-hidden shadow-2xl"
              >
                <div className="relative p-10 bg-zinc-950 border border-white/5 rounded-[40px] space-y-10 overflow-hidden">
                  {/* WATERMARK LOGO */}
                  <div className="absolute top-10 right-10 opacity-10">
                    <Bike size={80} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em]">
                      <Package size={14} />
                      Ticket de Entrega
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-5xl font-black tracking-tighter leading-none text-white uppercase">{result.cidade}</h2>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-primary/20 text-primary text-sm font-black rounded-lg">{result.uf}</span>
                        <div className="h-1 w-8 bg-zinc-800 rounded-full" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Entrega Porta a Porta</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Prazo Estimado</p>
                      <p className="text-3xl font-black text-white tracking-tighter uppercase">{result.prazo} <span className="text-sm opacity-50">DIAS ÚTEIS</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Mercadoria</p>
                      <p className="text-lg font-black text-white uppercase truncate">{result.produto}</p>
                    </div>
                  </div>

                  <div className="bg-primary p-10 rounded-[35px] flex flex-col items-center text-primary-foreground shadow-2xl shadow-primary/40 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 group-hover:opacity-10 transition-opacity" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Valor Total do Frete</span>
                    <span className="text-7xl font-black tracking-tighter leading-none mb-1">
                      R$ {result.valorFinal.toFixed(2)}
                    </span>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60">Seguro e Taxas Incluso</p>
                  </div>

                  <div className="flex items-center justify-between opacity-40">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">fefobikes.com — Tabela Oficial 2024</div>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={handleCaptureImage}
                  disabled={capturing}
                  variant="outline"
                  className="h-14 rounded-2xl font-black uppercase tracking-widest border-2 gap-2 bg-background hover:bg-muted"
                >
                  {capturing ? <ArrowRight className="animate-spin" /> : <Download size={18} />}
                  Baixar Foto
                </Button>
                <Button 
                  onClick={shareTextWhatsApp}
                  className="h-14 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20 px-8"
                >
                  <Share2 size={18} />
                  Enviar Watts
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimuladorFreteTabela;
