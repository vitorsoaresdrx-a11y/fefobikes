import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Timer, 
  Play, 
  LogOut, 
  Coffee, 
  History, 
  User, 
  ChevronRight,
  Activity,
  CalendarDays,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
// Adicionando as importações necessárias que estavam faltando
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Componentes de UI Premium Fefo Bikes ---

const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const variants = {
    primary: "bg-[#820AD1] text-white hover:bg-[#9D3BE1] shadow-[0_10px_30px_rgba(130,10,209,0.3)]",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    ghost: "hover:bg-white/5 text-zinc-400 hover:text-white",
  };
  const sizes = {
    sm: "h-10 px-4 text-[10px] font-black uppercase tracking-widest",
    md: "h-14 px-8 text-sm font-bold",
    lg: "h-20 px-10 rounded-[28px] text-lg font-black uppercase tracking-tighter italic",
  };
  return (
    <button className={`inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const StatusBadge = ({ active }) => (
  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
    <span className="text-[10px] font-black uppercase tracking-widest">{active ? 'Jornada Ativa' : 'Fora de Expediente'}</span>
  </div>
);

// --- Componente Principal ---

export default function PontoRegistro() {
  const [time, setTime] = useState(new Date());
  const [isWorking, setIsWorking] = useState(false);
  const [logs, setLogs] = useState([
    { type: "Entrada", time: "08:02", date: "Hoje" },
    { type: "Saída Almoço", time: "12:05", date: "Hoje" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockAction = () => {
    setIsWorking(!isWorking);
    const newLog = {
      type: isWorking ? "Saída" : "Entrada",
      time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: "Hoje"
    };
    setLogs([newLog, ...logs]);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#820AD1]/30">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Header de Identificação */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
             <div className="w-16 h-16 rounded-[24px] bg-[#161618] border border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                <User size={32} className="text-zinc-600 group-hover:text-[#820AD1] transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#820AD1]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none mb-1">Lucas Ferreira</h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Mecânico Master // ID: 0844</p>
             </div>
          </div>
          <StatusBadge active={isWorking} />
        </header>

        {/* Cockpit Central de Tempo */}
        <div className="relative group">
           {/* Glow Effect de fundo */}
           <div className={`absolute inset-0 transition-all duration-1000 blur-[80px] opacity-20 -z-10 ${isWorking ? 'bg-emerald-500' : 'bg-[#820AD1]'}`} />
           
           <div className="bg-[#161618] border border-zinc-800 rounded-[40px] p-10 md:p-16 shadow-2xl overflow-hidden relative">
              {/* Ícone de fundo */}
              <div className="absolute -right-10 -top-10 opacity-[0.02] text-white">
                <Clock size={300} />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Horário Local Atualizado</p>
                    <h2 className="text-7xl md:text-8xl font-black text-white tracking-tighter tabular-nums leading-none">
                      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      <span className="text-xl md:text-2xl text-[#820AD1] ml-2 opacity-50">
                        {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                      </span>
                    </h2>
                    <p className="text-sm font-bold text-zinc-400 capitalize flex items-center justify-center gap-2">
                      <CalendarDays size={16} className="text-[#820AD1]" />
                      {format(time, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                 </div>

                 <div className="flex flex-col w-full max-w-sm gap-4">
                    <Button 
                      variant="primary" 
                      size="lg" 
                      onClick={handleClockAction}
                      className={isWorking ? "bg-zinc-100 text-black hover:bg-white" : ""}
                    >
                      {isWorking ? (
                        <span className="flex items-center gap-3">
                          <LogOut size={22} /> Encerrar Turno
                        </span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <Play size={22} fill="currentColor" /> Registrar Entrada
                        </span>
                      )}
                    </Button>
                    <div className="grid grid-cols-2 gap-4">
                       <Button variant="secondary" className="rounded-2xl gap-2 text-xs">
                          <Coffee size={16} className="text-amber-500" /> Intervalo
                       </Button>
                       <Button variant="secondary" className="rounded-2xl gap-2 text-xs">
                          <AlertCircle size={16} className="text-zinc-500" /> Ocorrência
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Extrato e Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Resumo da Jornada */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                 <Timer size={16} className="text-[#820AD1]" />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Métricas de Hoje</h3>
              </div>
              <div className="bg-[#161618] border border-zinc-800 rounded-[32px] p-8 grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Total Trabalhado</p>
                    <p className="text-2xl font-black text-white tracking-tighter italic">04h 32m</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Banco de Horas</p>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter italic">+12h 15m</p>
                 </div>
              </div>
           </div>

           {/* Histórico Recente */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <History size={16} className="text-[#820AD1]" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Batidas Recentes</h3>
                 </div>
                 <button className="text-[10px] font-black uppercase text-zinc-600 hover:text-white transition-colors">Ver Tudo</button>
              </div>
              <div className="bg-[#161618] border border-zinc-800 rounded-[32px] p-2 space-y-1">
                 {logs.map((log, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'Entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#820AD1]/10 text-[#820AD1]'}`}>
                            {log.type === 'Entrada' ? <Activity size={18} /> : <LogOut size={18} />}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-zinc-200">{log.type}</p>
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{log.date}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-white tabular-nums">{log.time}</p>
                         <div className="flex items-center gap-1 justify-end text-zinc-700">
                            <ShieldCheck size={10} />
                            <span className="text-[8px] font-bold uppercase">Verificado</span>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

      {/* Footer / Info GPS */}
      <footer className="py-12 border-t border-zinc-900 flex flex-col items-center gap-3 opacity-30 grayscale pointer-events-none">
         <div className="flex items-center gap-2">
            <Activity size={14} className="text-white" />
            <span className="text-[9px] font-black uppercase tracking-widest">Localização Criptografada via IP-Auth</span>
         </div>
         <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Rota Pro Security System // 2026</p>
      </footer>
    </div>
  );
}
