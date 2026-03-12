import { useState } from "react";
import {
  History,
  Wrench,
  User,
  Phone,
  CreditCard,
  Calendar,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useBikeServiceHistory, type GroupedBikeHistory } from "@/hooks/useBikeServiceHistory";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function MecanicosHistorico() {
  const { data: groups = [], isLoading } = useBikeServiceHistory();
  const [selected, setSelected] = useState<GroupedBikeHistory | null>(null);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100">
      <div className="w-full max-w-7xl mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
              <History className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-widest text-[#2952FF]">HISTÓRICO</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight italic uppercase text-white">
            Histórico de Mecânicos
          </h1>
          <p className="text-zinc-500 font-medium text-sm">Todos os atendimentos agrupados por quadro</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 space-y-3 opacity-30">
            <History className="mx-auto" size={40} />
            <p className="text-xs font-black uppercase tracking-widest">Nenhum histórico encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.frame_number}
                onClick={() => setSelected(group)}
                className="w-full bg-[#161618] border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:border-zinc-700 transition-all text-left"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-black text-white uppercase truncate">{group.bike_name}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Quadro: {group.frame_number} • {group.records.length} atendimento(s)
                  </p>
                </div>
                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="bg-[#1C1C1E] border-zinc-800 w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-black text-white italic uppercase">
              {selected?.bike_name}
            </SheetTitle>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Quadro: {selected?.frame_number}
            </p>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {selected?.records.map((record, i) => (
              <div key={record.id} className="bg-[#161618] border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#2952FF] uppercase tracking-widest">
                    Atendimento #{selected.records.length - i}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500">
                    {formatDate(record.completed_at || record.created_at)}
                  </span>
                </div>

                <div className="p-3 bg-[#0A0A0B] rounded-xl border border-zinc-800/50">
                  <p className="text-xs text-zinc-400">{record.problem}</p>
                </div>

                <div className="flex flex-wrap gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {record.customer_name && (
                    <span className="flex items-center gap-1"><User size={10} /> {record.customer_name}</span>
                  )}
                  {record.customer_phone && (
                    <span className="flex items-center gap-1"><Phone size={10} /> {record.customer_phone}</span>
                  )}
                  {record.customer_cpf && (
                    <span className="flex items-center gap-1"><CreditCard size={10} /> {record.customer_cpf}</span>
                  )}
                  {record.mechanic_name && (
                    <span className="flex items-center gap-1"><Wrench size={10} /> {record.mechanic_name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
