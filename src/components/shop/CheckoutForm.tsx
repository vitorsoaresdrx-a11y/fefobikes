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
          style: {
             customVariables: {
                inputColor: '#ffffff',
                inputPlaceholderColor: 'rgba(255, 255, 255, 0.2)',
             }
          },
          appearance: {
            theme: 'dark'
          },
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

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (shipping?.valor || 0);
   return (
     <div className="space-y-8 py-2">
       {/* High-End Visual Header */}
       <header className="space-y-6">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#EFFF00] text-black flex items-center justify-center shadow-[0_0_20px_rgba(239,255,0,0.3)]">
                  <CreditCard size={20} strokeWidth={2.5} />
               </div>
               <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">Pagamento Seguro</h2>
                  <div className="flex items-center gap-1.5 opacity-40">
                     <ShieldCheck size={12} className="text-emerald-500" />
                     <span className="text-[9px] font-bold uppercase tracking-widest">Criptografia RSA @ 256-bit</span>
                  </div>
               </div>
            </div>
            
            <div className="text-right">
               <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-0.5">Total à Pagar</span>
               <span className="text-3xl font-black text-[#EFFF00] tracking-tighter italic">{formatBRL(total)}</span>
            </div>
         </div>
       </header>
 
       {/* Card form UI */}
       <form id="cardForm" className="space-y-5">
         {/* Card Holder Name (Standard Input) */}
         <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Titular do Cartão</label>
            <div className="relative group">
               <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-[#EFFF00] transition-colors" size={18} />
               <input 
                 id="cardholderName" 
                 placeholder="Nome impresso no cartão"
                 className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#EFFF00]/40 focus:bg-white/[0.06] transition-all placeholder:text-white/10 uppercase" 
               />
            </div>
         </div>
 
         {/* Card Number (MP IFRAME) */}
         <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Número do Cartão</label>
            <div id="cardNumber" className="w-full h-14 min-h-[56px] bg-white/[0.04] border border-white/5 rounded-2xl px-6 flex items-center transition-all focus-within:border-[#EFFF00]/40" />
         </div>
 
         {/* Expiry & CVV Grid */}
         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Validade</label>
               <div id="expirationDate" className="w-full h-14 min-h-[56px] bg-white/[0.04] border border-white/5 rounded-2xl px-5 flex items-center" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">CVV / CVC</label>
               <div id="securityCode" className="w-full h-14 min-h-[56px] bg-white/[0.04] border border-white/5 rounded-2xl px-5 flex items-center" />
            </div>
         </div>
 
         {/* Installments Selection */}
         <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Parcelamento</label>
            <div className="relative group">
               <select 
                  id="installments" 
                  className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white appearance-none focus:outline-none focus:border-[#EFFF00]/40 focus:bg-white/[0.06] transition-all"
               />
               <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-white/10 pointer-events-none" size={16} />
               <div id="issuer" className="hidden" />
               <input type="hidden" id="cardholderEmail" value={customer.email} />
            </div>
         </div>
 
         {errorStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
            >
               <AlertCircle size={18} />
               <p className="text-[11px] font-bold tracking-tight">{ERROR_MAP[errorStatus] || "Erro ao processar dados. Verifique e tente novamente."}</p>
            </motion.div>
         )}
 
         <div className="pt-4 flex flex-col gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#EFFF00] text-black rounded-2xl font-black uppercase text-[13px] tracking-[0.2em] shadow-[0_20px_40px_rgba(239,255,0,0.2)] hover:bg-white transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                   <Loader2 className="animate-spin" size={20} />
                   <span className="animate-pulse">PROCESSANDO...</span>
                </div>
              ) : (
                <>CONFIRMAR PAGAMENTO <div className="p-1 bg-black/10 rounded-lg group-hover:bg-black/5 transition-colors"><ArrowRight size={18} strokeWidth={3} /></div></>
              )}
            </button>
            <button 
              type="button" 
              onClick={onCancel}
              className="text-[9px] font-black text-white/10 uppercase tracking-[0.6em] hover:text-white transition-colors py-2"
            >
              Voltar ao pedido
            </button>
         </div>
       </form>
 
       <footer className="pt-2 flex items-center justify-center gap-5 grayscale opacity-20 pointer-events-none">
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Mercado_Pago_logo.svg" className="h-4" alt="Mercado Pago" />
          <div className="w-px h-3 bg-white/20" />
          <div className="flex items-center gap-2">
             <Lock size={10} />
             <span className="text-[8px] font-black text-white uppercase tracking-widest">Transação 100% Protegida</span>
          </div>
       </footer>
     </div>
   );
 }
