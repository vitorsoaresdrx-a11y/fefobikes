/**
 * PREMIUM MERCADO PAGO CHECKOUT FORM
 * This component handles card tokenization via MP SDK v2 and completes the payment process.
 * It features a polished UI/UX, real-time validations, and localized error handling.
 */

import { useState, useEffect } from "react";
// @ts-ignore
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { 
  CreditCard, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Lock,
  LockKeyhole
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

interface CheckoutFormProps {
  items: any[];
  shipping: { descricao: string, valor: number };
  customer: {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
  };
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

// Localized Error Map
const ERROR_MAP: Record<string, string> = {
  "cc_rejected_insufficient_amount": "Saldo insuficiente no cartão.",
  "cc_rejected_bad_filled_security_code": "Código de segurança inválido.",
  "cc_rejected_bad_filled_date": "Data de validade incorreta.",
  "cc_rejected_bad_filled_other": "Verifique os dados do cartão.",
  "cc_rejected_call_for_authorize": "Pagamento não autorizado pela operadora.",
  "cc_rejected_card_disabled": "Este cartão está desativado.",
  "cc_rejected_high_risk": "Pagamento recusado por segurança.",
  "cc_rejected_invalid_installments": "Quantidade de parcelas inválida.",
  "internal_error": "Erro interno no processamento. Tente novamente."
};

export function CheckoutForm({ items, shipping, customer, onSuccess, onCancel }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    const publicKey = (window as any).MP_PUBLIC_KEY || "TEST-8df4f535-cb0a-40a2-b9e7-4e5c4a5c4a5c";

    const setupMP = async () => {
      try {
        await loadMercadoPago();
        const mp = new (window as any).MercadoPago(publicKey, { locale: 'pt-BR' });

        const cardForm = mp.cardForm({
          amount: total.toString(),
          iframe: true,
          form: {
            id: "cardForm",
            cardNumber: { id: "cardNumber", placeholder: "Número do Cartão" },
            expirationDate: { id: "expirationDate", placeholder: "MM/AA" },
            securityCode: { id: "securityCode", placeholder: "CVC" },
            cardholderName: { id: "cardholderName", placeholder: "Nome impresso" },
            issuer: { id: "issuer", placeholder: "Banco" },
            installments: { id: "installments", placeholder: "Parcelas" },
            cardholderEmail: { id: "cardholderEmail", placeholder: "Email" },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) console.error("Card Form mount error:", error);
            },
            onSubmit: async (event: any) => {
              event.preventDefault();
              const { token, installments, paymentMethodId } = cardForm.getCardFormData();
              
              setLoading(true);
              setErrorStatus(null);

              try {
                const { data, error: payError } = await supabase.functions.invoke("mercadopago-checkout", {
                  body: {
                    itens: items.map(i => ({ 
                      nome: i.name, 
                      quantidade: i.quantity, 
                      preco_unitario: i.price 
                    })),
                    frete: shipping,
                    cliente: customer,
                    cartao: {
                      token,
                      parcelas: parseInt(installments),
                    },
                    payment_method_id: paymentMethodId,
                  }
                });

                if (payError) throw payError;

                if (data.status === "approved") {
                  onSuccess(data.pagamento_id);
                } else if (data.status === "rejected" || data.status === "in_process") {
                   setErrorStatus(data.status_detail);
                }

              } catch (err: any) {
                console.error("Payment Submission Error:", err);
                setErrorStatus(err.status_detail || "internal_error");
                toast.error("Falha no pagamento", { description: ERROR_MAP[err.status_detail] || "Algo deu errado." });
              } finally {
                setLoading(false);
              }
            },
          },
        });
      } catch (err) {
        console.error("MP Load Error:", err);
      }
    };

    setupMP();
  }, []);

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + shipping.valor;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A0A] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] max-w-lg w-full relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
        <LockKeyhole size={120} strokeWidth={1} />
      </div>

      <header className="space-y-6 mb-10 relative z-10">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-[#EFFF00] text-black flex items-center justify-center shadow-[0_10px_30px_rgba(239,255,0,0.2)]">
              <CreditCard size={24} strokeWidth={2.5} />
           </div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pagamento Seguro</h2>
              <div className="flex items-center gap-2 mt-0.5">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Transação Criptografada</span>
              </div>
           </div>
        </div>

        <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
           <div className="flex flex-col gap-1">
             <span className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Total da Compra</span>
             <span className="text-2xl font-black text-[#EFFF00]">{formatBRL(total)}</span>
           </div>
           <div className="text-right">
             <span className="text-[10px] font-bold text-white/20 block mb-1">Items + Frete</span>
             <span className="text-[11px] font-black text-white/60 uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">À vista ou Parcelado</span>
           </div>
        </div>
      </header>

      {/* Card Form Mercado Pago UI */}
      <form id="cardForm" className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 gap-5">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Dados do Titular</label>
              <input 
                id="cardholderName" 
                className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:outline-none focus:border-[#EFFF00] transition-all placeholder:text-white/10" 
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Número do Cartão</label>
              <div id="cardNumber" className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-6 text-sm flex items-center transition-all" />
           </div>

           <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Validade</label>
                 <div id="expirationDate" className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-4 flex items-center" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">CVV</label>
                 <div id="securityCode" className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-4 flex items-center" />
              </div>
           </div>

           <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Opções de Parcelamento</label>
                 <select 
                    id="installments" 
                    className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white appearance-none focus:outline-none focus:border-[#EFFF00] transition-all"
                  />
                  <div id="issuer" className="hidden" />
                  <input type="hidden" id="cardholderEmail" value={customer.email} />
              </div>
           </div>
        </div>

        {errorStatus && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }} 
             animate={{ opacity: 1, scale: 1 }}
             className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500"
           >
              <AlertCircle size={20} />
              <p className="text-xs font-bold leading-relaxed">{ERROR_MAP[errorStatus] || "Erro ao processar. Verifique os dados."}</p>
           </motion.div>
        )}

        <div className="pt-6 flex flex-col gap-4">
           <button 
             type="submit" 
             disabled={loading}
             className="w-full h-16 bg-[#EFFF00] text-black rounded-2xl font-black uppercase text-[13px] tracking-[0.2em] shadow-[0_20px_40px_rgba(239,255,0,0.15)] hover:bg-white transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30"
           >
             {loading ? <Loader2 className="animate-spin" /> : <>CONFIRMAR PAGAMENTO <ArrowRight size={20} strokeWidth={3} /></>}
           </button>
           <button 
             type="button" 
             onClick={onCancel}
             className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-white transition-colors"
           >
             Cancelar Transação
           </button>
        </div>
      </form>

      <footer className="mt-10 flex items-center justify-center gap-4 grayscale opacity-20 pointer-events-none">
         <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Mercado_Pago_logo.svg" className="h-4" alt="Mercado Pago" />
         <div className="w-px h-3 bg-white/20" />
         <span className="text-[9px] font-bold text-white uppercase tracking-widest">Checkout Transparente</span>
      </footer>
    </motion.div>
  );
}
