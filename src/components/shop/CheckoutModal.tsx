/**
 * CHECKOUT MODAL DRAWER
 * This component manages the checkout process flow:
 * Step 1: Customer Info (Name, Email, CPF, Phone)
 * Step 2: Payment Form (Mercado Pago Card Form)
 * Step 3: Success Feedback
 */

import { useState } from "react";
import * as Drawer from "vaul";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  ChevronLeft,
  X,
  CreditCard,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { formatBRL } from "@/lib/format";
import { CheckoutForm } from "./CheckoutForm";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, shipping, clearCart } = useCart();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customer, setCustomer] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: ""
  });

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (shipping?.valor || 0);

  const handleNext = () => {
    if (!customer.nome || !customer.email || !customer.cpf || !customer.telefone) return;
    setStep(2);
  };

  const handleSuccess = (paymentId: string) => {
    setStep(3);
    setTimeout(() => {
        clearCart();
    }, 2000);
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80]" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-[100] max-h-[96vh] bg-[#050505] rounded-t-[40px] border-t border-white/5 flex flex-col focus:outline-none">
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 md:p-12 scrollbar-hide">
            <div className="max-w-2xl mx-auto">
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <header className="space-y-2">
                       <span className="text-[10px] font-black text-[#EFFF00] uppercase tracking-[0.4em]">Passo 01 / 02</span>
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter">Dados do Pedido</h2>
                       <p className="text-white/30 text-sm font-medium">Preencha seus dados para prosseguir para o pagamento.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Nome Completo</label>
                          <div className="relative group">
                             <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EFFF00] transition-colors" />
                             <input 
                               value={customer.nome}
                               onChange={(e) => setCustomer({...customer, nome: e.target.value})}
                               className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#EFFF00] transition-all"
                               placeholder="Como deseja ser chamado?" 
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">E-mail</label>
                          <div className="relative group">
                             <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EFFF00] transition-colors" />
                             <input 
                               value={customer.email}
                               onChange={(e) => setCustomer({...customer, email: e.target.value})}
                               className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#EFFF00] transition-all"
                               placeholder="nome@exemplo.com"
                               type="email"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">CPF do Titular</label>
                          <div className="relative group">
                             <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EFFF00] transition-colors" />
                             <input 
                               value={customer.cpf}
                               onChange={(e) => setCustomer({...customer, cpf: e.target.value})}
                               className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#EFFF00] transition-all"
                               placeholder="000.000.000-00"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">WhatsApp</label>
                          <div className="relative group">
                             <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EFFF00] transition-colors" />
                             <input 
                               value={customer.telefone}
                               onChange={(e) => setCustomer({...customer, telefone: e.target.value})}
                               className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#EFFF00] transition-all"
                               placeholder="(00) 00000-0000"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Resumo do Carrinho</span>
                          <span className="text-xl font-black text-[#EFFF00]">{formatBRL(total)}</span>
                       </div>
                       <button 
                         onClick={handleNext}
                         className="h-14 px-8 bg-[#EFFF00] text-black rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#EFFF00]/10 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-30"
                         disabled={!customer.nome || !customer.email || !customer.cpf || !customer.telefone}
                       >
                         PAGAMENTO <ArrowRight size={18} strokeWidth={3} />
                       </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center"
                  >
                    <button 
                      onClick={() => setStep(1)} 
                      className="self-start flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white mb-8"
                    >
                      <ChevronLeft size={16} /> Voltar aos dados
                    </button>
                    <CheckoutForm 
                      items={items} 
                      shipping={shipping!} 
                      customer={customer} 
                      onSuccess={handleSuccess} 
                      onCancel={() => setStep(1)} 
                    />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-20 flex flex-col items-center text-center space-y-8"
                  >
                    <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-black shadow-[0_20px_40px_rgba(16,185,129,0.3)]">
                       <CheckCircle2 size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter">Pedido Aprovado!</h2>
                       <p className="text-white/40 text-base font-medium max-w-sm mx-auto leading-relaxed">
                         Obrigado pela sua compra. Enviamos um e-mail de confirmação para <span className="text-white">{customer.email}</span>.
                       </p>
                    </div>
                    <button 
                      onClick={onClose}
                      className="h-16 px-12 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#EFFF00] transition-colors"
                    >
                      Voltar à Loja
                    </button>
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
