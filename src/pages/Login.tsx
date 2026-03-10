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
    className={`inline-flex items-center justify-center rounded-2xl bg-[#2952FF] hover:bg-[#4A6FFF] text-white font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(41,82,255,0.3)] transition-all active:scale-95 disabled:opacity-70 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const InputEl = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex w-full bg-[#161618] border border-zinc-800 h-14 px-4 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#2952FF] focus:border-transparent transition-all placeholder:text-zinc-600 ${className}`}
    {...props}
  />
);

const LabelEl = ({ children, className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={`text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 block ${className}`}
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

  const imageUrl =
    "https://i.postimg.cc/DwztNbJB/bd759f9c2751e679b3155387f90f9821.jpg";

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
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-[#2952FF]/30">

      {/* Imagem — esquerda no desktop, topo no mobile */}
      <div className="relative w-full lg:w-[60%] h-[40vh] lg:h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] hover:scale-110"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-transparent via-[#0A0A0B]/60 to-[#0A0A0B]" />

        {/* Branding (só desktop) */}
        <div className="hidden lg:flex absolute bottom-12 left-12 flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.4)]">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-widest text-white">FEFO BIKES</span>
          </div>
          <p className="text-zinc-400 font-medium max-w-xs">
            Performance e precisão para quem não aceita menos que o topo.
          </p>
        </div>
      </div>

      {/* Formulário — direita */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:pr-40 relative z-10 bg-[#0A0A0B]">
        <div className="w-full max-w-md space-y-10">

          {/* Header */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-14 h-14 bg-[#820AD1] rounded-[22px] flex items-center justify-center shadow-[0_0_30px_rgba(130,10,209,0.3)]">
                <Bike className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter leading-tight">
              Acesse sua conta
            </h1>
            <p className="text-zinc-500 text-sm font-medium">
              Entre com suas credenciais para gerenciar sua oficina.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">

              {/* E-mail */}
              <div className="space-y-2 group">
                <LabelEl className="ml-1 group-focus-within:text-[#820AD1] transition-colors">
                  E-mail
                </LabelEl>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#820AD1] transition-colors" />
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
                <LabelEl className="ml-1 group-focus-within:text-[#820AD1] transition-colors">
                  Senha
                </LabelEl>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#820AD1] transition-colors" />
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
            <p className="text-xs text-zinc-600 font-medium italic">
              Acesso restrito a colaboradores autorizados da Fefo Bikes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
