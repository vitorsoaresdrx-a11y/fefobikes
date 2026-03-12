import { useCallback } from "react";
import { Printer, MessageCircle, X } from "lucide-react";
import { formatBRL } from "@/lib/format";

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

function paymentLabelSimple(data: ReceiptData) {
  const m = data.paymentMethod;
  if (m === "pix") return "PIX";
  if (m === "dinheiro") return "Dinheiro";
  if (m === "cartão de crédito") {
    if (data.installments && data.installmentValue) {
      return `Crédito ${data.installments}x`;
    }
    return "Crédito";
  }
  if (m === "cartão de débito") return "Débito";
  if (m === "transferência") return "Transferência";
  return m;
}

function paymentDetail(data: ReceiptData) {
  const m = data.paymentMethod;
  if (m === "dinheiro" && data.change && data.change > 0) {
    return `Pago: ${formatBRL(data.amountPaid ?? data.total)} · Troco: ${formatBRL(data.change)}`;
  }
  if (m === "cartão de crédito" && data.installments && data.installmentValue) {
    return `${data.installments}x de ${formatBRL(data.installmentValue)}`;
  }
  return null;
}

// ─── WhatsApp message builder ────────────────────────────────────────────────

function buildWhatsAppMessage(data: ReceiptData) {
  const lines: string[] = [];
  lines.push("🚴 *FEFO BIKES*");
  lines.push("Av. Ipanema, 1036 — Sorocaba, SP");
  lines.push("(15) 99612-8054");
  lines.push("");
  lines.push(`📋 Pedido: #${data.orderNumber}`);
  lines.push(`📅 ${formatDate(data.timestamp)} às ${formatTime(data.timestamp)}`);
  lines.push("");

  if (data.customerName) {
    lines.push(`👤 Cliente: ${data.customerName}`);
    if (data.customerWhatsapp) lines.push(`📱 ${data.customerWhatsapp}`);
    lines.push("");
  }

  lines.push("*ITENS:*");
  data.items.forEach((item) => {
    lines.push(`• ${item.name} x${item.quantity} — ${formatBRL(item.quantity * item.unit_price)}`);
  });
  lines.push("");

  lines.push(`Subtotal: ${formatBRL(data.subtotal)}`);
  if (data.discount > 0) lines.push(`Desconto: -${formatBRL(data.discount)}`);
  lines.push(`*TOTAL: ${formatBRL(data.total)}*`);
  lines.push("");

  lines.push(`💳 ${paymentLabelSimple(data)} — ${formatBRL(data.total)}`);
  const detail = paymentDetail(data);
  if (detail) lines.push(detail);
  lines.push("");
  lines.push("Obrigado pela preferência! 🚴");
  lines.push("Garantia de 90 dias em mão de obra.");
  lines.push("FeFo Bikes — (15) 99612-8054");

  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

// ─── Print HTML builder ─────────────────────────────────────────────────────

function buildPrintHTML(data: ReceiptData) {
  const detail = paymentDetail(data);
  const itemsHTML = data.items
    .map(
      (item) => `
      <div class="row small">
        <span class="left">${item.name}</span>
        <span class="right">${formatBRL(item.quantity * item.unit_price)}</span>
      </div>
      <p class="xsmall mt4">${item.quantity}x ${formatBRL(item.unit_price)}</p>`
    )
    .join("");

  const customerHTML = data.customerName
    ? `
      <div class="divider"></div>
      <p class="section-label">Cliente</p>
      <p class="small bold">${data.customerName}</p>
      ${data.customerWhatsapp ? `<p class="small">${data.customerWhatsapp}</p>` : ""}`
    : "";

  const discountHTML =
    data.discount > 0
      ? `<div class="row small"><span>Desconto</span><span>-${formatBRL(data.discount)}</span></div>`
      : "";

  const detailHTML = detail ? `<p class="xsmall mt4">${detail}</p>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Recibo - FeFo Bikes</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',Courier,monospace;font-size:12px;color:#000;background:#fff;width:80mm;max-width:80mm;padding:4mm}
    .center{text-align:center}
    .bold{font-weight:bold}
    .big{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:2px}
    .small{font-size:11px}
    .xsmall{font-size:9px;color:#444}
    .divider{border-top:1px dashed #000;margin:6px 0}
    .row{display:flex;justify-content:space-between;margin-bottom:2px}
    .row .left{flex:1;padding-right:6px}
    .row .right{white-space:nowrap}
    .section-label{font-size:9px;text-transform:uppercase;font-weight:bold;margin-bottom:4px}
    .total{font-size:14px;font-weight:900}
    .mt4{margin-top:4px}
    .mt8{margin-top:8px}
  </style>
</head>
<body>
  <div class="center">
    <p class="big">FeFo Bikes</p>
    <p class="small mt4">Av. Ipanema, 1036 — Sorocaba, SP</p>
    <p class="small">CEP: 18070-671</p>
    <p class="small">(15) 99612-8054</p>
    <p class="small">CNPJ: 27.291.055/0001-54</p>
  </div>

  <div class="divider"></div>

  <div class="row small">
    <span>PEDIDO #${data.orderNumber}</span>
    <span>${formatDate(data.timestamp)} ${formatTime(data.timestamp)}</span>
  </div>

  ${customerHTML}

  <div class="divider"></div>
  <p class="section-label">Itens</p>
  ${itemsHTML}

  <div class="divider"></div>

  <div class="row small">
    <span>Subtotal</span>
    <span>${formatBRL(data.subtotal)}</span>
  </div>
  ${discountHTML}
  <div class="row total mt4">
    <span>TOTAL</span>
    <span>${formatBRL(data.total)}</span>
  </div>

  <div class="divider"></div>

  <p class="section-label">Pagamento</p>
  <div class="row small">
    <span>${paymentLabelSimple(data)}</span>
    <span>${formatBRL(data.total)}</span>
  </div>
  ${detailHTML}

  <div class="divider"></div>

  <div class="center mt8">
    <p class="small">Obrigado pela preferência!</p>
    <p class="xsmall mt4">GARANTIA DE 90 DIAS EM MÃO DE OBRA</p>
    <p class="xsmall mt4">${new Date().toLocaleString("pt-BR")}</p>
  </div>
</body>
</html>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SaleReceipt({ open, onClose, data }: SaleReceiptProps) {
  const handlePrint = useCallback(() => {
    const html = buildPrintHTML(data);
    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, [data]);

  const handleWhatsApp = useCallback(() => {
    const msg = encodeURIComponent(buildWhatsAppMessage(data));
    const phone = data.customerWhatsapp?.replace(/\D/g, "");
    const url = phone ? `https://wa.me/55${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }, [data]);

  if (!open) return null;

  return (
    <div
      className="receipt-backdrop fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt card — white bg, black text to simulate thermal print */}
        <div className="overflow-y-auto max-h-[85vh] rounded-2xl">
          <div className="bg-white text-black rounded-2xl p-5 w-full">
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-black pb-3 mb-3">
              <p className="text-lg font-black uppercase tracking-widest">FeFo Bikes</p>
              <p className="text-xs">Av. Ipanema, 1036 — Sorocaba, SP</p>
              <p className="text-xs">CEP: 18070-671</p>
              <p className="text-xs">(15) 99612-8054</p>
              <p className="text-xs">CNPJ: 27.291.055/0001-54</p>
            </div>

            {/* Order + Date */}
            <div className="flex justify-between text-xs mb-3">
              <span className="font-bold">PEDIDO #{data.orderNumber}</span>
              <span>{formatDate(data.timestamp)} {formatTime(data.timestamp)}</span>
            </div>

            {/* Customer */}
            {data.customerName && (
              <div className="border-t border-dashed border-black pt-2 pb-2 mb-2">
                <p className="text-[10px] uppercase font-bold mb-1">Cliente</p>
                <p className="text-xs font-bold">{data.customerName}</p>
                {data.customerWhatsapp && (
                  <p className="text-xs">{data.customerWhatsapp}</p>
                )}
              </div>
            )}

            {/* Items */}
            <div className="border-t border-dashed border-black pt-2 pb-2 mb-2">
              <p className="text-[10px] uppercase font-bold mb-2">Itens</p>
              {data.items.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="flex-1 pr-2">{item.name}</span>
                    <span className="shrink-0 font-bold">
                      {formatBRL(item.quantity * item.unit_price)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mb-2">
                    {item.quantity}x {formatBRL(item.unit_price)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-black pt-2 pb-2 mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Subtotal</span>
                <span>{formatBRL(data.subtotal)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-xs mb-1">
                  <span>Desconto</span>
                  <span>-{formatBRL(data.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black mt-1">
                <span>TOTAL</span>
                <span>{formatBRL(data.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="border-t border-dashed border-black pt-2 pb-2 mb-3">
              <p className="text-[10px] uppercase font-bold mb-1">Pagamento</p>
              <div className="flex justify-between text-xs">
                <span>{paymentLabelSimple(data)}</span>
                <span>{formatBRL(data.total)}</span>
              </div>
              {(() => {
                const detail = paymentDetail(data);
                return detail ? (
                  <p className="text-[10px] text-gray-600 mt-0.5">{detail}</p>
                ) : null;
              })()}
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-black pt-3 text-center">
              <p className="text-xs">Obrigado pela preferência!</p>
              <p className="text-[10px] font-bold mt-1">GARANTIA DE 90 DIAS EM MÃO DE OBRA</p>
              <p className="text-[10px] mt-3 text-gray-500">
                {new Date().toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons — hidden on print */}
        <div className="receipt-actions flex gap-3 mt-4">
          <button
            onClick={handlePrint}
            className="flex-1 h-12 bg-black text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 h-12 bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="h-12 w-12 shrink-0 bg-zinc-800 text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
