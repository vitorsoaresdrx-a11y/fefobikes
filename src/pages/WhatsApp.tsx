import { useState, useRef, useEffect, useMemo } from "react";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useUpdateConversationStatus,
  useMarkAsRead,
  type Conversation,
} from "@/hooks/useWhatsApp";
import {
  MessageCircle,
  Send,
  Search,
  CheckCheck,
  Check,
  Clock,
  CircleDot,
  Copy,
  MoreVertical,
  User,
  Paperclip,
  Smile,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, phone?: string) {
  if (name) return name.slice(0, 2).toUpperCase();
  return (phone || "?").slice(-2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Abertas", value: "open" },
  { label: "Aguardando", value: "waiting" },
  { label: "Resolvidas", value: "resolved" },
];

const statusBadgeConfig: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  waiting: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  resolved: "bg-zinc-800 text-zinc-500 border-zinc-700",
};

const statusDotConfig: Record<string, string> = {
  open: "bg-emerald-500",
  waiting: "bg-amber-500",
  resolved: "bg-zinc-500",
};

const statusLabel: Record<string, string> = {
  open: "Aberto",
  waiting: "Aguardando",
  resolved: "Finalizado",
};

function ConversationBadge({ status }: { status: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusBadgeConfig[status] || statusBadgeConfig.resolved}`}
    >
      {statusLabel[status] || status}
    </span>
  );
}

function MessageStatus({ status }: { status: string }) {
  if (status === "read")
    return <CheckCheck className="h-3 w-3 text-white/70" />;
  if (status === "delivered")
    return <CheckCheck className="h-3 w-3 text-white/40" />;
  if (status === "sent")
    return <Check className="h-3 w-3 text-white/40" />;
  return <Clock className="h-3 w-3 text-white/40" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WhatsApp() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: conversations = [] } = useConversations(statusFilter);
  const { data: messages = [] } = useMessages(selectedConv?.id || null);
  const sendMessage = useSendMessage();
  const updateStatus = useUpdateConversationStatus();
  const markAsRead = useMarkAsRead();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.contact_name || "").toLowerCase().includes(q) ||
        c.contact_phone.includes(q)
    );
  }, [conversations, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConv && selectedConv.unread_count > 0) {
      markAsRead.mutate(selectedConv.id);
    }
  }, [selectedConv?.id]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv) return;
    sendMessage.mutate(
      {
        phone: selectedConv.contact_phone,
        message: messageText.trim(),
        conversationId: selectedConv.id,
      },
      {
        onSuccess: () => setMessageText(""),
        onError: () =>
          toast({ title: "Erro ao enviar mensagem", variant: "destructive" }),
      }
    );
  };

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-webhook`;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0A0A0B] text-zinc-100 overflow-hidden rounded-[40px] border border-zinc-800/50 shadow-2xl">

      {/* ── Sidebar: Conversas ─────────────────────────────────────────────── */}
      <aside className="w-96 flex flex-col border-r border-zinc-800/50 bg-[#111113]/50 shrink-0">

        {/* Header */}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(41,82,255,0.3)]">
                <MessageCircle size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">
                Mensagens
              </h1>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="space-y-4">
            <div className="relative group">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#2952FF] transition-colors"
              />
              <input
                placeholder="Buscar contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 bg-[#161618] border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm outline-none focus:border-[#2952FF] transition-all text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${
                    statusFilter === f.value
                      ? "bg-[#820AD1] border-[#820AD1] text-white shadow-lg"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4 scrollbar-none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 space-y-3">
              <MessageCircle size={40} strokeWidth={1} />
              <p className="text-xs font-bold uppercase tracking-widest">
                Nenhuma conversa
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full p-5 rounded-[28px] border transition-all flex items-center gap-4 group ${
                  selectedConv?.id === conv.id
                    ? "bg-[#1C1C1E] border-[#2952FF]/30 shadow-xl"
                    : "bg-transparent border-transparent hover:bg-white/[0.03]"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-700/50 group-hover:border-[#2952FF]/50 transition-colors font-bold text-lg uppercase">
                    {conv.contact_photo ? (
                      <img
                        src={conv.contact_photo}
                        className="w-full h-full object-cover rounded-2xl"
                        alt=""
                      />
                    ) : (
                      getInitials(conv.contact_name, conv.contact_phone)
                    )}
                  </div>
                  {/* Status dot */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#111113] ${statusDotConfig[conv.status] || "bg-zinc-500"}`}
                  />
                  {/* Unread badge */}
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#2952FF] text-white rounded-full flex items-center justify-center text-[10px] font-black border-4 border-[#0A0A0B]">
                      {conv.unread_count}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-bold truncate ${
                        selectedConv?.id === conv.id
                          ? "text-white"
                          : "text-zinc-300"
                      }`}
                    >
                      {conv.contact_name || conv.contact_phone}
                    </h4>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase shrink-0 ml-1">
                      {format(new Date(conv.last_message_at), "HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate font-medium">
                    {conv.last_message}
                  </p>
                  <div className="pt-1">
                    <ConversationBadge status={conv.status} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Webhook URL footer */}
        <div className="p-6 bg-[#0A0A0B] border-t border-zinc-800/50">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                  Webhook URL — Z-API
                </p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase italic flex items-center gap-1 mt-0.5">
                  <CircleDot size={8} /> Conectado
                </p>
              </div>
              <button
                className="p-2 text-zinc-700 hover:text-zinc-300 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast({ title: "URL copiada!" });
                }}
              >
                <Copy size={16} />
              </button>
            </div>
            <code className="block truncate text-[9px] text-zinc-600 font-mono">
              {webhookUrl}
            </code>
          </div>
        </div>
      </aside>

      {/* ── Chat Area ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col bg-[#0A0A0B] min-w-0">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-zinc-900 rounded-[40px] flex items-center justify-center text-zinc-800 border border-zinc-800/50 shadow-inner">
              <MessageCircle size={48} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-zinc-300 uppercase italic tracking-tighter">
                Hub de Conversas
              </h3>
              <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                Selecione um contato na lateral para iniciar o atendimento.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <header className="px-10 py-6 border-b border-zinc-800/50 flex items-center justify-between bg-[#111113]/30 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-700 font-bold uppercase">
                  {selectedConv.contact_photo ? (
                    <img
                      src={selectedConv.contact_photo}
                      className="w-full h-full object-cover rounded-xl"
                      alt=""
                    />
                  ) : (
                    getInitials(selectedConv.contact_name, selectedConv.contact_phone)
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tight leading-none mb-1">
                    {selectedConv.contact_name || selectedConv.contact_phone}
                  </h2>
                  <p className="text-xs text-zinc-500 font-bold tracking-widest flex items-center gap-2">
                    <Hash size={10} className="text-[#2952FF]" />
                    {selectedConv.contact_phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedConv.status !== "resolved" ? (
                  <button
                    onClick={() =>
                      updateStatus.mutate(
                        { id: selectedConv.id, status: "resolved" },
                        {
                          onSuccess: () =>
                            setSelectedConv({ ...selectedConv, status: "resolved" }),
                        }
                      )
                    }
                    className="h-9 px-4 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-all"
                  >
                    <CircleDot size={14} className="text-emerald-400" />
                    Resolver Caso
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateStatus.mutate(
                        { id: selectedConv.id, status: "open" },
                        {
                          onSuccess: () =>
                            setSelectedConv({ ...selectedConv, status: "open" }),
                        }
                      )
                    }
                    className="h-9 px-4 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-all"
                  >
                    Reabrir
                  </button>
                )}
                <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[65%] space-y-1">
                    {/* Media */}
                    {msg.type === "image" && msg.media_url && (
                      <img
                        src={msg.media_url}
                        alt="media"
                        className="max-w-full rounded-[24px] mb-2"
                      />
                    )}
                    {/* Bubble */}
                    <div
                      className={`p-5 shadow-lg ${
                        msg.from_me
                          ? "bg-[#820AD1] text-white rounded-[32px] rounded-tr-lg"
                          : "bg-[#161618] text-zinc-200 border border-zinc-800 rounded-[32px] rounded-tl-lg"
                      }`}
                    >
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                    {/* Meta */}
                    <div
                      className={`flex items-center gap-1.5 px-2 ${
                        msg.from_me ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {msg.from_me && <MessageStatus status={msg.status} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-8 pt-4 shrink-0">
              <div className="bg-[#161618] border border-zinc-800 rounded-[32px] p-2 flex items-center gap-2 shadow-2xl focus-within:border-[#820AD1]/50 transition-all">
                <div className="flex items-center px-2">
                  <button className="p-3 text-zinc-600 hover:text-[#820AD1] transition-colors">
                    <Paperclip size={20} />
                  </button>
                  <button className="p-3 text-zinc-600 hover:text-amber-500 transition-colors">
                    <Smile size={20} />
                  </button>
                </div>
                <input
                  placeholder="Escreva sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white py-4 placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="w-14 h-14 rounded-[24px] bg-[#820AD1] hover:bg-[#9D3BE1] flex items-center justify-center text-white shadow-[0_0_20px_rgba(130,10,209,0.2)] transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
