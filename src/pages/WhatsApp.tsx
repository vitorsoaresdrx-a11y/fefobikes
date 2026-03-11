import { useState, useRef, useEffect, useCallback } from "react";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useUpdateConversationStatus,
  useMarkAsRead,
  type Conversation,
} from "@/hooks/useWhatsApp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Send,
  Search,
  CheckCheck,
  Check,
  Clock,
  CircleDot,
  Copy,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function useZApiStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setStatus("loading");
      const { data, error } = await supabase.functions.invoke("zapi-status", {
        body: null,
        headers: {},
      });
      // Use query param approach
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=status`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      const connected = result?.connected === true || result?.status === "CONNECTED";
      setStatus(connected ? "connected" : "disconnected");
    } catch {
      setStatus("disconnected");
    }
  }, []);

  const fetchQrCode = useCallback(async () => {
    try {
      setLoadingQr(true);
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=qr-code`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      if (result?.qrCode) {
        setQrCode(result.qrCode);
      } else if (result?.value) {
        // Some Z-API versions return QR as value
        setQrCode(result.value);
      }
    } catch {
      // ignore
    } finally {
      setLoadingQr(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { status, qrCode, loadingQr, checkStatus, fetchQrCode };
}

const STATUS_FILTERS = [
  { label: "Todas", value: "all" },
  { label: "Abertas", value: "open" },
  { label: "Aguardando", value: "waiting" },
  { label: "Resolvidas", value: "resolved" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-500",
  waiting: "bg-yellow-500",
  resolved: "bg-zinc-500",
};

function getInitials(name?: string | null, phone?: string) {
  if (name) return name.slice(0, 2).toUpperCase();
  return (phone || "?").slice(-2);
}

function MessageStatus({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
  if (status === "sent") return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function WhatsApp() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: conversations = [] } = useConversations(statusFilter);
  const { data: messages = [] } = useMessages(selectedConv?.id || null);
  const sendMessage = useSendMessage();
  const updateStatus = useUpdateConversationStatus();
  const markAsRead = useMarkAsRead();
  const { status: connStatus, qrCode, loadingQr, checkStatus, fetchQrCode } = useZApiStatus();

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.contact_name || "").toLowerCase().includes(q) ||
      c.contact_phone.includes(q)
    );
  });

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
          toast({
            title: "Erro ao enviar mensagem",
            variant: "destructive",
          }),
      }
    );
  };

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-webhook`;

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      {/* Left: Conversation list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border">
        {/* Search */}
        <div className="space-y-3 border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="mb-2 h-8 w-8" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  selectedConv?.id === conv.id && "bg-muted"
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conv.contact_photo || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(conv.contact_name, conv.contact_phone)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      STATUS_COLORS[conv.status] || "bg-zinc-500"
                    )}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-foreground">
                      {conv.contact_name || conv.contact_phone}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {format(new Date(conv.last_message_at), "HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.last_message}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="ml-2 h-5 min-w-[20px] shrink-0 justify-center rounded-full bg-primary px-1.5 text-[10px]">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>

        {/* Webhook URL */}
        <div className="border-t border-border p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Webhook URL (Z-API)
          </p>
          <div className="flex items-center gap-1">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-[10px] text-foreground">
              {webhookUrl}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast({ title: "URL copiada!" });
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="flex flex-1 flex-col">
        {!selectedConv ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageCircle className="h-16 w-16 opacity-20" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedConv.contact_photo || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(
                      selectedConv.contact_name,
                      selectedConv.contact_phone
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedConv.contact_name || selectedConv.contact_phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConv.contact_phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConv.status !== "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate(
                        { id: selectedConv.id, status: "resolved" },
                        {
                          onSuccess: () =>
                            setSelectedConv({
                              ...selectedConv,
                              status: "resolved",
                            }),
                        }
                      )
                    }
                  >
                    <CircleDot className="mr-1.5 h-3.5 w-3.5" />
                    Resolver
                  </Button>
                )}
                {selectedConv.status === "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate(
                        { id: selectedConv.id, status: "open" },
                        {
                          onSuccess: () =>
                            setSelectedConv({
                              ...selectedConv,
                              status: "open",
                            }),
                        }
                      )
                    }
                  >
                    Reabrir
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.from_me ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5",
                        msg.from_me
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      )}
                    >
                      {msg.type === "image" && msg.media_url && (
                        <img
                          src={msg.media_url}
                          alt="media"
                          className="mb-1 max-w-full rounded-lg"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1",
                          msg.from_me
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground"
                        )}
                      >
                        <span className="text-[10px]">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                        {msg.from_me && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
