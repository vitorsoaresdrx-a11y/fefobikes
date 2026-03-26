/**
 * PREMIUM CHECKOUT FLOW MODAL
 * 1. CEP Calculation
 * 2. Order Summary & Choice (MP vs WhatsApp)
 * 3. Customer Data (if MP)
 * 4. Payment (if MP)
 */

import { useState } from "react";
import * as Drawer from "vaul";
import { 
  User, Mail, Phone, ShieldCheck, ArrowRight, CheckCircle2, 
  ChevronLeft, X, CreditCard, Package, MapPin, Loader2, Truck, 
  MessageCircle, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { formatBRL } from "@/lib/format";
import { CheckoutForm } from "./CheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, shipping, setShipping, clearCart } = useCart();
  const [step, setStep] = useState<"cep" | "summary" | "info" | "payment" | "success">("cep");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [customer, setCustomer] = useState({
    nome: "", email: "", cpf: "", telefone: ""
  });

  const cartTotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const finalTotal = cartTotal + (shipping?.valor || 0);

  const handleCalculateShipping = async () => {
    const targetCep = cep.replace(/\D/g, "");
    if (targetCep.length !== 8) {
      toast.error("CEP inválido");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: { 
          destinationZip: targetCep, 
          invoiceValue: cartTotal, 
          preset: items.some(i => i.price > 1000) ? "bike_completa" : "quadro",
          quantidade: 1 
        }
      });
      if (error || !data.sucesso) throw new Error(data?.error || "Falha no cálculo");
      setShipping({ 
        descricao: `Rodonaves (${data.cidade})`, 
        valor: data.valorFrete + 30 
      });
      setStep("summary");
    } catch (e: any) {
      toast.error("Erro no frete", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const itemsList = items.map(i => `- ${i.quantity}x ${i.name}`).join('\n');
    const msg = `Olá! Gostaria de finalizar meu pedido:\n\n${itemsList}\n\n*Produtos: ${formatBRL(cartTotal)}*\n*Frete: ${formatBRL(shipping?.valor || 0)} (${shipping?.descricao})*\n\n*Total: ${formatBRL(finalTotal)}*`;
    window.open(`https://wa.me/5515996128054?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleClose = () => {
    setStep("cep");
    setShowCancelConfirm(false);
    onClose();
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(o) => { if(!o) handleClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80]" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-[100] max-h-[96vh] bg-[#050505] rounded-t-[40px] border-t border-white/5 flex flex-col focus:outline-none overflow-hidden">
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 md:p-12 scrollbar-hide">
            <div className="max-w-2xl mx-auto">
              
              <AnimatePresence mode="wait">
                {step === "cep" && (
                  <motion.div key="cep" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 text-center">
                    <div className="w-20 h-20 bg-[#EFFF00] rounded-3xl mx-auto flex items-center justify-center text-black shadow-lg shadow-[#EFFF00]/20">
                      <Truck size={36} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter">Calcular Entrega</h2>
                       <p className="text-white/30 text-sm font-medium">Informe seu CEP para calcularmos o frete antes de prosseguir.</p>
                    </div>
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="relative">
                         <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                         <input 
                           value={cep} 
                           onChange={e => {
                             const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                             setCep(v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v);
                           }} 
                           className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-xl font-black text-center tracking-widest text-[#EFFF00] focus:border-[#EFFF00] outline-none transition-all placeholder:text-white/5" 
                           placeholder="00000-000"
                         />
                      </div>
                      <button 
                        onClick={handleCalculateShipping}
                        className="w-full h-16 bg-[#EFFF00] text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-20"
                        disabled={loading || cep.length < 9}
                      >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : "Consultar Frete"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === "summary" && !showCancelConfirm && (
                   <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                      <header className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                           <Package size={24} />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black italic uppercase tracking-tighter">Resumo do Pedido</h2>
                           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Verifique os valores para continuar</p>
                        </div>
                      </header>

                      <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                         <div className="p-6 space-y-4 max-h-48 overflow-y-auto no-scrollbar">
                            {items.map(item => (
                               <div key={item.id} className="flex items-center justify-between text-white/60">
                                  <span className="text-sm font-bold truncate pr-4">{item.quantity}x {item.name}</span>
                                  <span className="text-sm font-black whitespace-nowrap">{formatBRL(item.price * item.quantity)}</span>
                               </div>
                            ))}
                         </div>
                         <div className="p-8 bg-white/[0.02] border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between text-white/30 text-xs font-bold uppercase tracking-widest">
                               <span>Produtos</span>
                               <span>{formatBRL(cartTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[#EFFF00] text-xs font-bold uppercase tracking-widest">
                               <div className="flex items-center gap-2">
                                  <Truck size={14} />
                                  <span>Frete ({shipping?.descricao})</span>
                               </div>
                               <span>{formatBRL(shipping?.valor || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                               <span className="text-xl font-black italic uppercase">Total Final</span>
                               <span className="text-3xl font-black text-[#EFFF00] tracking-tighter">{formatBRL(finalTotal)}</span>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <button onClick={() => setStep("info")} className="h-16 bg-[#EFFF00] text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-white transition-all flex items-center justify-center gap-3">
                            PROSSEGUIR <ArrowRight size={18} />
                         </button>
                         <button onClick={handleWhatsApp} className="h-16 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                            <MessageCircle size={18} /> FALAR COM SUPORTE
                         </button>
                      </div>
                      
                      <button onClick={() => setShowCancelConfirm(true)} className="w-full text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-red-500 transition-colors">
                        Cancelar Compra
                      </button>
                   </motion.div>
                )}

                {showCancelConfirm && (
                   <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center space-y-8">
                      <div className="w-20 h-20 bg-red-500/10 rounded-3xl mx-auto flex items-center justify-center text-red-500">
                         <AlertTriangle size={36} />
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Tem certeza?</h2>
                        <p className="text-white/40 font-medium">Seu carrinho será mantido para quando você voltar.</p>
                      </div>
                      <div className="flex flex-col gap-4 max-w-xs mx-auto">
                         <button onClick={handleClose} className="h-16 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all">
                            Sim, Cancelar
                         </button>
                         <button onClick={() => setShowCancelConfirm(false)} className="h-16 bg-white/5 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">
                            Não, Voltar ao Pedido
                         </button>
                      </div>
                   </motion.div>
                )}

                {step === "info" && (
                   <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                      <header className="space-y-2">
                         <span className="text-[10px] font-black text-[#EFFF00] uppercase tracking-[0.4em]">Passo Final</span>
                         <h2 className="text-4xl font-black italic uppercase tracking-tighter">Dados de Entrega</h2>
                      </header>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Nome</label>
                           <input value={customer.nome} onChange={e=>setCustomer({...customer, nome: e.target.value})} className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-[#EFFF00]" />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">WhatsApp</label>
                           <input value={customer.telefone} onChange={e=>setCustomer({...customer, telefone: e.target.value})} className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-[#EFFF00]" />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Email</label>
                           <input value={customer.email} onChange={e=>setCustomer({...customer, email: e.target.value})} className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-[#EFFF00]" />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">CPF</label>
                           <input value={customer.cpf} onChange={e=>setCustomer({...customer, cpf: e.target.value})} className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-[#EFFF00]" />
                         </div>
                      </div>
                      <button onClick={()=>setStep("payment")} disabled={!customer.nome || !customer.cpf} className="w-full h-16 bg-[#EFFF00] text-black rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-30">PAGAMENTO SEGURO</button>
                   </motion.div>
                )}

                {step === "payment" && (
                   <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <CheckoutForm items={items} shipping={shipping!} customer={customer} onSuccess={() => setStep("success")} onCancel={() => setStep("summary")} />
                   </motion.div>
                )}

                {step === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-500 rounded-[32px] mx-auto flex items-center justify-center text-black">
                       <CheckCircle2 size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter">Pedido Aprovado!</h2>
                       <p className="text-white/40 text-base font-medium max-w-sm mx-auto leading-relaxed">
                         Obrigado. Enviamos um e-mail de confirmação para {customer.email}.
                       </p>
                    </div>
                    <button onClick={handleClose} className="h-16 px-12 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest">Sair</button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
