import { useCallback } from "react";
import { Printer, MessageCircle, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptData {
  orderNumber: string;
  timestamp: Date;
  customerName?: string;
  customerWhatsapp?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  installments?: number;
  installmentValue?: number;
}

interface SaleReceiptProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentLabel(data: ReceiptData) {
  const m = data.paymentMethod;
  if (m === "pix") return `PIX — ${formatBRL(data.total)}`;
  if (m === "dinheiro") {
    const change = data.change ?? 0;
    return change > 0
      ? `Dinheiro — Troco: ${formatBRL(change)}`
      : `Dinheiro — ${formatBRL(data.total)}`;
  }
  if (m === "cartão de crédito" && data.installments && data.installmentValue) {
    return `Cartão de Crédito — ${data.installments}x de ${formatBRL(data.installmentValue)}`;
  }
  if (m === "cartão de débito") return `Cartão de Débito — ${formatBRL(data.total)}`;
  return `${m} — ${formatBRL(data.total)}`;
}

// ─── WhatsApp message builder ────────────────────────────────────────────────

function buildWhatsAppMessage(data: ReceiptData) {
  const lines: string[] = [];
  lines.push("🚴 *FEFO BIKES*");
  lines.push("Comprovante de Venda");
  lines.push("");
  lines.push(`📋 Pedido: #${data.orderNumber}`);
  lines.push(`📅 Data: ${formatDate(data.timestamp)} às ${formatTime(data.timestamp)}`);
  lines.push("");

  if (data.customerName) {
    lines.push(`👤 Cliente: ${data.customerName}`);
    lines.push("");
  }

  lines.push("*ITENS:*");
  data.items.forEach((item) => {
    lines.push(`• ${item.name} x${item.quantity} — ${formatBRL(item.quantity * item.unit_price)}`);
  });
  lines.push("");

  lines.push(`Subtotal: ${formatBRL(data.subtotal)}`);
  if (data.discount > 0) lines.push(`Desconto: ${formatBRL(data.discount)}`);
  lines.push(`*TOTAL: ${formatBRL(data.total)}*`);
  lines.push("");

  lines.push(`💳 Pagamento: ${paymentLabel(data)}`);
  lines.push("");
  lines.push("Obrigado pela preferência! 🚴");
  lines.push("Garantia de 90 dias em mão de obra.");
  lines.push("Fefo Bikes — (11) 99999-9999");

  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SaleReceipt({ open, onClose, data }: SaleReceiptProps) {
  const handlePrint = useCallback(() => window.print(), []);

  const handleWhatsApp = useCallback(() => {
    const msg = encodeURIComponent(buildWhatsAppMessage(data));
    const phone = data.customerWhatsapp?.replace(/\D/g, "");
    const url = phone ? `https://wa.me/55${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }, [data]);

  if (!open) return null;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sale-receipt-print, #sale-receipt-print * { visibility: visible !important; }
          #sale-receipt-print {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 80mm !important; max-width: 100% !important;
            background: white !important; color: black !important;
            font-family: monospace !important; font-size: 12px !important;
            padding: 8mm !important; margin: 0 !important;
            border: none !important; border-radius: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          #sale-receipt-print h2, #sale-receipt-print h3, #sale-receipt-print p,
          #sale-receipt-print span, #sale-receipt-print td, #sale-receipt-print th {
            color: black !important; background: transparent !important;
            border-color: #ccc !important;
          }
          #sale-receipt-print .receipt-separator {
            border-color: #ccc !important;
          }
          .receipt-actions { display: none !important; }
          .receipt-backdrop { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="receipt-backdrop fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Receipt card */}
          <div
            id="sale-receipt-print"
            className="bg-[#0A0A0B] border border-zinc-800 rounded-[32px] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#2952FF]/5 border-b border-zinc-800 p-8 text-center space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">FEFO BIKES</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                Rua Exemplo, 123 — São Paulo, SP
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                (11) 99999-9999 — CNPJ: 00.000.000/0001-00
              </p>
            </div>

            <div className="p-8 space-y-6">
              {/* Order info */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Pedido</p>
                  <p className="text-xl font-black text-[#2952FF]">#{data.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Data</p>
                  <p className="text-sm font-bold text-zinc-300">{formatDate(data.timestamp)}</p>
                  <p className="text-xs text-zinc-500">{formatTime(data.timestamp)}</p>
                </div>
              </div>

              {/* Customer */}
              {data.customerName && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Cliente</p>
                  <p className="text-sm font-bold text-white">{data.customerName}</p>
                  {data.customerWhatsapp && (
                    <p className="text-xs text-zinc-500">{data.customerWhatsapp}</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Itens</p>
                {data.items.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-bold text-zinc-200 truncate">{item.name}</p>
                        <p className="text-[10px] text-zinc-600">
                          {item.quantity} × {formatBRL(item.unit_price)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-white shrink-0">
                        {formatBRL(item.quantity * item.unit_price)}
                      </p>
                    </div>
                    {i < data.items.length - 1 && (
                      <div className="receipt-separator h-px bg-zinc-800/50 mt-3" />
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="receipt-separator border-t border-dashed border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatBRL(data.subtotal)}</span>
                </div>
                {data.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Desconto</span>
                    <span>-{formatBRL(data.discount)}</span>
                  </div>
                )}
                <div className="receipt-separator border-t border-zinc-800 pt-3 flex justify-between items-end">
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Total</span>
                  <span className="text-3xl font-black text-white tracking-tighter">
                    {formatBRL(data.total)}
                  </span>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-[#2952FF]/5 border border-[#2952FF]/20 rounded-2xl p-4">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">
                  Pagamento
                </p>
                <p className="text-sm font-bold text-[#2952FF]">{paymentLabel(data)}</p>
              </div>

              {/* Footer */}
              <div className="text-center space-y-1 pt-2">
                <p className="text-sm text-zinc-400 font-medium">
                  Obrigado pela preferência! 🚴
                </p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  Garantia de 90 dias em mão de obra
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="receipt-actions flex gap-3 mt-4">
            <button
              onClick={handlePrint}
              className="flex-1 h-14 bg-[#1C1C1E] border border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-300 font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex-1 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm hover:bg-emerald-500 transition-all active:scale-95"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button
              onClick={onClose}
              className="h-14 w-14 shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
