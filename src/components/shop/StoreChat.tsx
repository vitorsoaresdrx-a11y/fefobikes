import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bike, 
  Sparkles,
  Loader2,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function StoreChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async ({ message, history }: { message: string, history: ChatMessage[] }) => {
      const { data, error } = await supabase.functions.invoke("store-ai-chat", {
        body: { message, history }
      });
      if (error) throw error;
      return data.response as string;
    },
    onSuccess: (response) => {
      setHistory((prev) => [...prev, { role: "assistant", content: response }]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return;
    const userMsg = input.trim();
    setHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    mutation.mutate({ message: userMsg, history });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="fixed bottom-6 left-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 left-0 w-80 sm:w-96 h-[500px] bg-background border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[70] origin-bottom-left"
          >
            {/* Header */}
            <header className="bg-primary p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white italic uppercase tracking-tight">Fefo AI</h3>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-white/70 uppercase">Online agora</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-white hover:bg-black/20"
              >
                <ChevronDown size={18} />
              </button>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/5 scrollbar-hide">
              {history.length === 0 && (
                <div className="py-10 text-center space-y-4 opacity-50">
                  <Bike size={48} strokeWidth={1} className="mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">Dae! Sou o Fefo AI 🚲💨</p>
                    <p className="text-[10px] font-medium max-w-[200px] mx-auto leading-relaxed">
                      Dúvidas sobre o catálogo? Precisa de uma dica de upgrade? Pode mandar!
                    </p>
                  </div>
                </div>
              )}
              
              {history.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-primary text-white rounded-br-none" 
                      : "bg-card border border-border/50 text-foreground rounded-bl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {mutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border/50 rounded-2xl rounded-bl-none px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Mande sua dúvida..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="w-full h-12 bg-secondary/50 border border-border/50 rounded-2xl pl-4 pr-12 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 focus:bg-secondary"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || mutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white disabled:opacity-50 transition-all hover:scale-110 active:scale-95"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[9px] text-center text-muted-foreground/30 mt-3 font-bold uppercase tracking-widest">
                Fefo Bikes AI • Performance Insight
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-16 w-16 bg-white border border-border rounded-full shadow-2xl flex items-center justify-center text-primary active:scale-95 transition-all group relative overflow-hidden"
      >
        <motion.div 
          animate={isOpen ? { rotate: 90, scale: 0 } : { rotate: 0, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sparkles size={24} className="group-hover:text-primary active:text-primary transition-colors" />
        </motion.div>
        
        <motion.div
           animate={isOpen ? { rotate: 0, scale: 1 } : { rotate: -90, scale: 0 }}
           className="absolute inset-0 flex items-center justify-center"
        >
          <X size={24} className="text-muted-foreground" />
        </motion.div>

        {!isOpen && (
           <span className="absolute -top-1 -right-1 flex h-4 w-4">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
             <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
           </span>
        )}
      </button>
    </div>
  );
}
