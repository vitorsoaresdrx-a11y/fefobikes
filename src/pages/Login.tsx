import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bike, Lock, Mail, ArrowRight } from "lucide-react";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  className = "",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-2xl bg-primary hover:bg-primary/80 text-white font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(41,82,255,0.3)] transition-all active:scale-95 disabled:opacity-70 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const InputEl = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex w-full bg-card border border-border h-14 px-4 rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/70 ${className}`}
    {...props}
  />
);

const LabelEl = ({ children, className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={`text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block ${className}`}
    {...props}
  >
    {children}
  </label>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Login() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl =
    "https://i.postimg.cc/15gFKyyF/Lona-painel-led-1920-x-1080-px-20260310-164540-0000.png";

  // Lógica real do Lovable — supabase.auth.signInWithPassword + useToast
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: err.message || "Erro na autenticação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-primary/30">

      {/* Imagem — esquerda no desktop, topo no mobile */}
      <div className="relative w-full lg:w-[60%] h-[40vh] lg:h-screen overflow-hidden">
        {/* Hidden preloader */}
        <img
          src={imageUrl}
          alt=""
          className="sr-only"
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-transparent via-background/30 to-background/70" />

        {/* Branding (só desktop) */}
        <div className="hidden lg:flex absolute bottom-12 left-12 flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.4)]">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-widest text-white">FEFO BIKES</span>
          </div>
          <p className="text-muted-foreground font-medium max-w-xs">
            Performance e precisão para quem não aceita menos que o topo.
          </p>
        </div>
      </div>

      {/* Formulário — direita */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 relative z-10 bg-background">
        <div className="w-full max-w-md space-y-10">

          {/* Header */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-14 h-14 bg-primary rounded-[22px] flex items-center justify-center shadow-primary/30">
                <Bike className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tighter leading-tight">
              Acesse sua conta
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Entre com suas credenciais para gerenciar sua oficina.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">

              {/* E-mail */}
              <div className="space-y-2 group">
              <LabelEl className="ml-1 group-focus-within:text-primary transition-colors">
                E-mail
              </LabelEl>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                  <InputEl
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-12"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2 group">
              <LabelEl className="ml-1 group-focus-within:text-primary transition-colors">
                Senha
              </LabelEl>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                  <InputEl
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-12"
                  />
                </div>
              </div>
            </div>

            <Btn type="submit" className="w-full h-14" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <span className="flex items-center gap-2">
                  Entrar no Sistema <ArrowRight size={18} />
                </span>
              )}
            </Btn>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground/70 font-medium italic">
              Acesso restrito a colaboradores autorizados da Fefo Bikes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
