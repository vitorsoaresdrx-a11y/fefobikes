import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  X, 
  Send, 
  Bike, 
  Bot,
  Loader2,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StoreChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoreChat({ isOpen, onClose }: StoreChatProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async ({ message, history }: { message: string, history: ChatMessage[] }) => {
      const { data, error } = await supabase.functions.invoke("store-ai-chat", {
        body: { message, history: history.slice(-5) }
      });
      if (error) throw error;
      return data.response as string;
    },
    onSuccess: (response) => {
      setHistory((prev) => [...prev, { role: "assistant", content: response }]);
    },
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

  const formatMessage = (content: string) => {
    const urlRegex = /((https?:\/\/[^\s]+)|(bit\.ly\/[^\s]+))/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.match(urlRegex)) {
        const href = part.startsWith("http") ? part : `https://${part}`;
        return (
          <a 
            key={i} 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-[#EFFF00]/20 px-2 py-0.5 rounded-lg underline decoration-[#EFFF00]/30 hover:decoration-[#EFFF00] transition-all font-black"
          >
            Link <ExternalLink size={10} />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="w-full max-w-lg h-[80vh] sm:h-[600px] bg-black border-t sm:border border-white/10 rounded-t-[40px] sm:rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-[110]"
          >
            {/* Header */}
            <header className="bg-gradient-to-r from-black to-[#111] p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#EFFF00] rounded-2xl flex items-center justify-center text-black shadow-[0_5px_20px_rgba(239,255,0,0.2)]">
                  <Bot size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white italic uppercase tracking-tighter">FEFO AI BOLADO</h3>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="h-2 w-2 rounded-full bg-[#EFFF00] animate-pulse" />
                    <span className="text-[10px] font-black text-[#EFFF00] uppercase tracking-widest">Performance Active</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-black to-[#050505] scrollbar-hide">
              {history.length === 0 && (
                <div className="py-20 text-center space-y-6 opacity-80">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Bike size={40} strokeWidth={1} className="text-[#EFFF00]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black uppercase tracking-widest text-[#EFFF00]">Dae! Sou o Fefo AI 🚲💨</p>
                    <p className="text-xs font-medium max-w-[240px] mx-auto leading-relaxed text-white/40 italic">
                      "Quer saber qual o melhor quadro ou tá na dúvida se essa buzina serve na sua bike? Chama que eu te ajudo!"
                    </p>
                  </div>
                </div>
              )}
              
              {history.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-[24px] px-5 py-3.5 text-sm font-bold leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-[#EFFF00] text-black rounded-br-none shadow-[0_5px_15px_rgba(239,255,0,0.2)]" 
                      : "bg-white/[0.03] border border-white/10 text-white rounded-bl-none shadow-xl"
                  }`}>
                    {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
                  </div>
                </motion.div>
              ))}
              
              {mutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-none px-5 py-3.5">
                    <Loader2 className="h-5 w-5 animate-spin text-[#EFFF00]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/5 bg-black">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Mande sua dúvida real..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-5 pr-14 text-sm font-black focus:outline-none focus:border-[#EFFF00]/50 placeholder:text-white/20 transition-all focus:bg-white/[0.05]"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || mutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#EFFF00] flex items-center justify-center text-black disabled:opacity-30 transition-all hover:scale-105 active:scale-90 shadow-lg"
                >
                  <Send size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="h-px flex-1 bg-white/5" />
                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
                  FEFO BIKES AI
                </p>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
