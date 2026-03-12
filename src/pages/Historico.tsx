import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, ChevronDown, ChevronUp, Printer, User, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/useSales";
import { SaleReceipt, type ReceiptData } from "@/components/pdv/SaleReceipt";
import { formatBRL } from "@/lib/format";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const paymentLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  "cartão de crédito": "Crédito",
  "cartão de débito": "Débito",
  transferência: "Transferência",
};

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

export default function Historico() {
  const { data: sales = [], isLoading } = useSales();
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Group sales by customer
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

    // Sort groups by last purchase date (most recent first)
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime()
    );
  }, [sales]);

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return customerGroups;
    const q = debouncedSearch.toLowerCase();
    return customerGroups.filter((g) =>
      g.customerName.toLowerCase().includes(q) ||
      (g.customerWhatsapp && g.customerWhatsapp.includes(q)) ||
      (g.customerCpf && g.customerCpf.includes(q))
    );
  }, [customerGroups, search]);

  const toggleCustomer = (key: string) => {
    setExpandedCustomer(expandedCustomer === key ? null : key);
    setExpandedSale(null);
  };

  const openReceipt = (sale: any) => {
    setReceiptData(buildReceiptFromSale(sale));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Histórico de Vendas</h1>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, WhatsApp ou CPF..."
          className="bg-card border-border h-9 text-sm pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {search ? "Nenhum cliente encontrado" : "Nenhuma venda registrada"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((group) => {
            const key = group.customerId || `anon-${group.sales[0].id}`;
            const isExpanded = expandedCustomer === key;

            return (
              <div key={key} className="border border-border rounded-md bg-card overflow-hidden">
                {/* Customer header */}
                <button
                  type="button"
                  onClick={() => toggleCustomer(key)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{group.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.sales.length} compra{group.sales.length !== 1 ? "s" : ""} • Última: {formatShortDate(group.lastPurchase)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-sm font-semibold text-foreground">{formatBRL(group.totalSpent)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded: list of sales */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Customer info */}
                    {(group.customerWhatsapp || group.customerCpf) && (
                      <div className="px-4 py-2 bg-muted/10 text-xs text-muted-foreground flex gap-4 flex-wrap">
                        {group.customerWhatsapp && <span>WhatsApp: {group.customerWhatsapp}</span>}
                        {group.customerCpf && <span>CPF: {group.customerCpf}</span>}
                      </div>
                    )}

                    {/* Sales list */}
                    <div className="divide-y divide-border">
                      {group.sales
                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((sale: any) => {
                          const items = sale.sale_items || [];
                          const saleExpanded = expandedSale === sale.id;
                          const cardFee = Number(sale.card_fee) || 0;
                          const cardTax = Number(sale.card_tax_percent) || 0;

                          return (
                            <div key={sale.id}>
                              <button
                                type="button"
                                onClick={() => setExpandedSale(saleExpanded ? null : sale.id)}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/10 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</span>
                                  {sale.payment_method && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                      {paymentLabel[sale.payment_method] || sale.payment_method}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    • {items.length} ite{items.length !== 1 ? "ns" : "m"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                  <span className="text-sm font-medium text-foreground">{formatBRL(Number(sale.total))}</span>
                                  {saleExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                              </button>

                              {saleExpanded && (
                                <div className="px-4 pb-3 pt-1 space-y-2 ml-5">
                                  {/* Items */}
                                  <div className="space-y-1">
                                    {items.map((item: any) => (
                                      <div key={item.id} className="flex justify-between text-sm">
                                        <span className="text-foreground">
                                          {item.quantity}x {item.description}
                                        </span>
                                        <span className="text-muted-foreground">{formatBRL(item.quantity * Number(item.unit_price))}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Totals */}
                                  <div className="border-t border-border pt-2 space-y-0.5">
                                    <div className="flex justify-between text-sm font-medium">
                                      <span className="text-muted-foreground">Total</span>
                                      <span className="text-foreground">{formatBRL(Number(sale.total))}</span>
                                    </div>
                                    {cardFee > 0 && (
                                      <>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Taxa cartão ({cardTax}%)</span>
                                          <span className="text-destructive">-{formatBRL(cardFee)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Líquido</span>
                                          <span className="text-emerald-500">{formatBRL(Number(sale.total) - cardFee)}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {sale.notes && (
                                    <p className="text-xs text-muted-foreground italic">Obs: {sale.notes}</p>
                                  )}

                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-xs"
                                      onClick={(e) => { e.stopPropagation(); openReceipt(sale); }}
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      Reimprimir
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} • {sales.length} venda{sales.length !== 1 ? "s" : ""}
      </p>

      {receiptData && (
        <SaleReceipt
          open={!!receiptData}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}
    </div>
  );
}
