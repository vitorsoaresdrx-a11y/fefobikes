import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Printer, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/useSales";
import { SaleReceipt, type ReceiptData } from "@/components/pdv/SaleReceipt";

import { formatBRL } from "@/lib/format";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

export default function Historico() {
  const { data: sales = [], isLoading } = useSales();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter((s: any) => {
      const customer = s.customers;
      return (
        (customer?.name && customer.name.toLowerCase().includes(q)) ||
        (customer?.whatsapp && customer.whatsapp.includes(q)) ||
        (s.payment_method && s.payment_method.toLowerCase().includes(q))
      );
    });
  }, [sales, search]);

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
          placeholder="Buscar por cliente ou pagamento..."
          className="bg-card border-border h-9 text-sm pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {search ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale: any) => {
            const customer = sale.customers;
            const items = sale.sale_items || [];
            const expanded = expandedId === sale.id;
            const cardFee = Number(sale.card_fee) || 0;
            const cardTax = Number(sale.card_tax_percent) || 0;

            return (
              <div key={sale.id} className="border border-border rounded-md bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : sale.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {customer?.name || "Cliente não informado"}
                      </span>
                      {sale.payment_method && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {paymentLabel[sale.payment_method] || sale.payment_method}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(sale.created_at)} • {items.length} ite{items.length !== 1 ? "ns" : "m"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-semibold text-foreground">{formatBRL(Number(sale.total))}</span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {/* Customer info */}
                    {customer && (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {customer.whatsapp && <p>WhatsApp: {customer.whatsapp}</p>}
                        {customer.cpf && <p>CPF: {customer.cpf}</p>}
                      </div>
                    )}

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

                    {/* Receipt actions */}
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
      )}

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} venda{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Receipt modal */}
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
