import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, ChevronDown, Printer, User, ShoppingBag, Download } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { SaleReceipt, type ReceiptData } from "@/components/pdv/SaleReceipt";
import { formatBRL } from "@/lib/format";
import { exportSalesCSV } from "@/lib/export-csv";
import { EmptyState } from "@/components/EmptyState";
import { PaginationBar } from "@/components/PaginationBar";
import { usePagination } from "@/hooks/usePagination";

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatDateTime(d: string) {
  const date = new Date(d);
  return {
    date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

const paymentLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  "cartão de crédito": "Crédito",
  "cartão de débito": "Débito",
  transferência: "Transferência",
};

function getPaymentStyle(method: string) {
  switch (method) {
    case "pix":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "dinheiro":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

function buildReceiptFromSale(sale: any): ReceiptData {
  const customer = sale.customers;
  const items = (sale.sale_items || []).map((item: any) => ({
    name: item.description,
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
  }));
  return {
    orderNumber: sale.id.slice(-4).toUpperCase(),
    timestamp: new Date(sale.created_at),
    customerName: customer?.name || undefined,
    customerWhatsapp: customer?.whatsapp || undefined,
    items,
    subtotal: Number(sale.total),
    discount: 0,
    total: Number(sale.total),
    paymentMethod: sale.payment_method || "pix",
  };
}

interface CustomerGroup {
  customerId: string | null;
  customerName: string;
  customerWhatsapp: string | null;
  customerCpf: string | null;
  sales: any[];
  totalSpent: number;
  lastPurchase: string;
}

// ─── Sale Row ─────────────────────────────────────────────────────────────────

function SaleRow({
  sale,
  isExpanded,
  onToggle,
  onReceipt,
}: {
  sale: any;
  isExpanded: boolean;
  onToggle: () => void;
  onReceipt: () => void;
}) {
  const items = sale.sale_items || [];
  const { date, time } = formatDateTime(sale.created_at);
  const method = sale.payment_method || "pix";
  const cardFee = Number(sale.card_fee) || 0;
  const cardTax = Number(sale.card_tax_percent) || 0;

  return (
    <div className="px-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3"
      >
        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
          <ShoppingBag size={13} className="text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs text-zinc-400">
            {date} · {time}
          </p>
          <span
            className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${getPaymentStyle(method)}`}
          >
            {paymentLabel[method] || method}
          </span>
        </div>
        <p className="text-sm font-black text-white shrink-0">
          {formatBRL(Number(sale.total))}
        </p>
        <ChevronDown
          size={12}
          className={`text-zinc-600 ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="pb-3 space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-xs px-2">
              <span className="text-zinc-400">
                {item.quantity}x {item.description}
              </span>
              <span className="font-bold text-zinc-300">
                {formatBRL(item.quantity * Number(item.unit_price))}
              </span>
            </div>
          ))}

          <div className="flex justify-between text-xs px-2 pt-2 border-t border-zinc-800 mt-2">
            <span className="font-black text-white uppercase text-[10px]">Total</span>
            <span className="font-black text-white">{formatBRL(Number(sale.total))}</span>
          </div>

          {cardFee > 0 && (
            <div className="px-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Taxa cartão ({cardTax}%)</span>
                <span className="text-red-400">-{formatBRL(cardFee)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Líquido</span>
                <span className="text-emerald-400">{formatBRL(Number(sale.total) - cardFee)}</span>
              </div>
            </div>
          )}

          {sale.notes && (
            <p className="text-xs text-zinc-500 italic px-2">Obs: {sale.notes}</p>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onReceipt();
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors px-2 mt-1"
          >
            <Printer size={12} /> Reimprimir
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Historico() {
  const { data: sales = [], isLoading } = useSales();
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();

    for (const sale of sales) {
      const customer = sale.customers;
      const key = customer?.id || `anon-${sale.id}`;

      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.sales.push(sale);
        group.totalSpent += Number(sale.total);
        if (sale.created_at > group.lastPurchase) {
          group.lastPurchase = sale.created_at;
        }
      } else {
        groups.set(key, {
          customerId: customer?.id || null,
          customerName: customer?.name || "Cliente não informado",
          customerWhatsapp: customer?.whatsapp || null,
          customerCpf: customer?.cpf || null,
          sales: [sale],
          totalSpent: Number(sale.total),
          lastPurchase: sale.created_at,
        });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime()
    );
  }, [sales]);

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return customerGroups;
    const q = debouncedSearch.toLowerCase();
    return customerGroups.filter(
      (g) =>
        g.customerName.toLowerCase().includes(q) ||
        (g.customerWhatsapp && g.customerWhatsapp.includes(q)) ||
        (g.customerCpf && g.customerCpf.includes(q))
    );
  }, [customerGroups, debouncedSearch]);

  const toggleCustomer = (key: string) => {
    setExpandedCustomer(expandedCustomer === key ? null : key);
    setExpandedSale(null);
  };

  const totalSalesCount = filtered.reduce((sum, g) => sum + g.sales.length, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30">
      <div className="max-w-3xl mx-auto w-full p-4 lg:p-8 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-extrabold tracking-tight">
            Histórico de Vendas
          </h1>
          {sales.length > 0 && (
            <button
              onClick={() => exportSalesCSV(sales)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider border border-zinc-800 rounded-xl px-3 py-2 hover:border-zinc-600"
            >
              <Download size={14} /> Exportar
            </button>
          )}
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, WhatsApp ou CPF..."
            className="w-full bg-[#161618] border border-zinc-800 rounded-2xl h-10 pl-10 pr-4 text-sm text-zinc-200 outline-none focus:border-[#2952FF]/50 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#2952FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 text-sm">
            {search ? "Nenhum cliente encontrado" : "Nenhuma venda registrada"}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((group) => {
              const key = group.customerId || `anon-${group.sales[0].id}`;
              const isExpanded = expandedCustomer === key;
              const n = group.sales.length;

              return (
                <div
                  key={key}
                  className="rounded-2xl bg-[#161618] border border-zinc-800 overflow-hidden"
                >
                  {/* Customer header */}
                  <button
                    type="button"
                    onClick={() => toggleCustomer(key)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <User size={18} className="text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-black text-white truncate">
                        {group.customerName}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {n} compra{n > 1 ? "s" : ""} · Última{" "}
                        {formatDateShort(group.lastPurchase)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-black text-white">
                        {formatBRL(group.totalSpent)}
                      </p>
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 mt-1 mx-auto transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800">
                      {/* Customer info */}
                      {(group.customerWhatsapp || group.customerCpf) && (
                        <div className="px-4 py-3 flex gap-4 bg-zinc-800/30">
                          {group.customerWhatsapp && (
                            <div>
                              <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-wider">
                                WhatsApp
                              </p>
                              <p className="text-xs font-bold text-zinc-300">
                                {group.customerWhatsapp}
                              </p>
                            </div>
                          )}
                          {group.customerCpf && (
                            <div>
                              <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-wider">
                                CPF
                              </p>
                              <p className="text-xs font-bold text-zinc-300">
                                {group.customerCpf}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sales list */}
                      <div className="divide-y divide-zinc-800/50">
                        {group.sales
                          .sort(
                            (a: any, b: any) =>
                              new Date(b.created_at).getTime() -
                              new Date(a.created_at).getTime()
                          )
                          .map((sale: any) => (
                            <SaleRow
                              key={sale.id}
                              sale={sale}
                              isExpanded={expandedSale === sale.id}
                              onToggle={() =>
                                setExpandedSale(
                                  expandedSale === sale.id ? null : sale.id
                                )
                              }
                              onReceipt={() =>
                                setReceiptData(buildReceiptFromSale(sale))
                              }
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer summary */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex justify-between items-center px-1 py-3 text-[10px] text-zinc-600 uppercase tracking-widest">
            <span>{filtered.length} clientes</span>
            <span>{totalSalesCount} vendas</span>
          </div>
        )}

        {/* Receipt modal */}
        {receiptData && (
          <SaleReceipt
            open={!!receiptData}
            onClose={() => setReceiptData(null)}
            data={receiptData}
          />
        )}
      </div>
    </div>
  );
}
