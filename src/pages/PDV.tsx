import { useState, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  ClipboardPlus,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBikeModels } from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useCreateSale } from "@/hooks/useSales";
import { useCardTaxes } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface CartItem {
  key: string;
  id: string;
  type: "bike" | "part";
  name: string;
  category: string | null;
  quantity: number;
  unit_price: number;
}

type Step = "idle" | "catalog" | "cart" | "customer";

export default function PDV() {
  const { toast } = useToast();
  const { data: bikes = [] } = useBikeModels();
  const { data: parts = [] } = useParts();
  const { data: customers = [] } = useCustomers();
  const { data: cardTaxes } = useCardTaxes();
  const createCustomer = useCreateCustomer();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("idle");

  // Catalog modal state
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("todas");
  const [catalogTab, setCatalogTab] = useState<"parts" | "bikes">("parts");

  // Cart modal state
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");

  // Customer modal state
  const [custName, setCustName] = useState("");
  const [custWhatsapp, setCustWhatsapp] = useState("");
  const [custCpf, setCustCpf] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [cart]
  );
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isCardPayment =
    paymentMethod === "cartão de crédito" || paymentMethod === "cartão de débito";
  const cardTaxPercent = isCardPayment
    ? paymentMethod === "cartão de crédito"
      ? cardTaxes?.credit_tax || 0
      : cardTaxes?.debit_tax || 0
    : 0;
  const cardFee = total * (cardTaxPercent / 100);

  // Categories from parts
  const categories = useMemo(() => {
    const cats = new Set<string>();
    parts.forEach((p) => p.category && cats.add(p.category));
    return Array.from(cats).sort();
  }, [parts]);

  // Filtered catalog items
  const catalogItems = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    if (catalogTab === "parts") {
      return parts.filter((p) => {
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
        const matchCat = catalogCategory === "todas" || p.category === catalogCategory;
        return matchSearch && matchCat;
      });
    }
    return bikes.filter((b) => {
      const matchSearch = !q || b.name.toLowerCase().includes(q) || (b.category || "").toLowerCase().includes(q);
      const matchCat = catalogCategory === "todas" || b.category === catalogCategory;
      return matchSearch && matchCat;
    });
  }, [parts, bikes, catalogSearch, catalogCategory, catalogTab]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return [];
    const q = custSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.whatsapp && c.whatsapp.includes(q)))
      .slice(0, 6);
  }, [customers, custSearch]);

  const addToCart = (id: string, type: "bike" | "part", name: string, price: number, category: string | null) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && i.type === type);
      if (existing) {
        return prev.map((i) =>
          i.id === id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { key: crypto.randomUUID(), id, type, name, category, quantity: 1, unit_price: price }];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  };

  const getCartQty = (id: string, type: "bike" | "part") =>
    cart.find((i) => i.id === id && i.type === type)?.quantity || 0;

  const openCatalog = () => {
    setCatalogSearch("");
    setCatalogCategory("todas");
    setStep("catalog");
  };

  const openCart = () => setStep("cart");

  const goToCustomer = () => {
    setCustName("");
    setCustWhatsapp("");
    setCustCpf("");
    setCustSearch("");
    setSelectedCustomerId(null);
    setStep("customer");
  };

  const handleFinalize = async () => {
    try {
      let customerId = selectedCustomerId;

      // Create customer if new
      if (!customerId && custName.trim()) {
        const created = await createCustomer.mutateAsync({
          name: custName.trim(),
          whatsapp: custWhatsapp.trim() || null,
          cpf: custCpf.trim() || null,
        });
        customerId = created.id;
      }

      await createSale.mutateAsync({
        customer_id: customerId,
        total,
        payment_method: paymentMethod,
        notes: null,
        card_fee: cardFee,
        card_tax_percent: cardTaxPercent,
        items: cart.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          bike_model_id: item.type === "bike" ? item.id : null,
          part_id: item.type === "part" ? item.id : null,
        })),
      });

      toast({ title: "Venda registrada com sucesso!" });
      setCart([]);
      setStep("idle");
      setPaymentMethod("dinheiro");
    } catch {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-foreground">Ponto de Venda</h1>
      </div>

      {/* Main area - empty state or summary */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        {cart.length === 0 ? (
          <div className="space-y-3">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Nenhum item adicionado
            </p>
            <Button onClick={openCatalog} className="gap-2">
              <ClipboardPlus className="h-4 w-4" />
              Registrar
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-3">
            <p className="text-sm text-muted-foreground mb-2">
              {itemCount} ite{itemCount !== 1 ? "ns" : "m"} no pedido
            </p>
            {cart.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 border border-border rounded-md bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}x {formatBRL(item.unit_price)}
                  </p>
                </div>
                <span className="text-sm font-medium text-foreground ml-3">
                  {formatBRL(item.quantity * item.unit_price)}
                </span>
              </div>
            ))}
            <Button variant="outline" onClick={openCatalog} className="w-full gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Adicionar mais itens
            </Button>
          </div>
        )}
      </div>

      {/* Bottom bar - iFood style */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{itemCount} ite{itemCount !== 1 ? "ns" : "m"}</p>
            <p className="text-base font-semibold text-foreground">{formatBRL(total)}</p>
          </div>
          <Button onClick={openCart} className="gap-2 px-6">
            <ShoppingCart className="h-4 w-4" />
            Ver pedido
          </Button>
        </div>
      )}

      {/* ===== MODAL 1: Catálogo de Estoque ===== */}
      <Dialog open={step === "catalog"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">Adicionar itens</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-2">
            <button
              type="button"
              onClick={() => { setCatalogTab("parts"); setCatalogCategory("todas"); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                catalogTab === "parts"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Peças
            </button>
            <button
              type="button"
              onClick={() => { setCatalogTab("bikes"); setCatalogCategory("todas"); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                catalogTab === "bikes"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Bikes
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar item..."
                className="h-9 text-sm pl-9 bg-background border-border"
              />
            </div>
          </div>

          {/* Category chips */}
          {catalogTab === "parts" && categories.length > 0 && (
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setCatalogCategory("todas")}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  catalogCategory === "todas"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategory(cat)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    catalogCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 min-h-0">
            {catalogItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum item encontrado</p>
            ) : (
              catalogItems.map((item: any) => {
                const isBike = catalogTab === "bikes";
                const id = item.id;
                const type = isBike ? "bike" : "part";
                const price = isBike
                  ? Number(item.sale_price) || 0
                  : Number(item.sale_price) || 0;
                const qty = getCartQty(id, type as "bike" | "part");

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-3 border border-border rounded-md bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.category && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {item.category}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{formatBRL(price)}</span>
                        {!isBike && (
                          <span className="text-[10px] text-muted-foreground/60">
                            estoque: {item.stock_qty}
                          </span>
                        )}
                      </div>
                    </div>
                    {qty > 0 ? (
                      <div className="flex items-center gap-1.5 ml-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQty(
                              cart.find((i) => i.id === id && i.type === type)!.key,
                              -1
                            )
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center text-foreground">
                          {qty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            addToCart(id, type as "bike" | "part", item.name, price, item.category)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 ml-2"
                        onClick={() =>
                          addToCart(id, type as "bike" | "part", item.name, price, item.category)
                        }
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom bar in catalog */}
          {cart.length > 0 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{itemCount} ite{itemCount !== 1 ? "ns" : "m"}</p>
                <p className="text-sm font-semibold text-foreground">{formatBRL(total)}</p>
              </div>
              <Button size="sm" onClick={() => setStep("idle")} className="gap-1.5">
                Concluir
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== MODAL 2: Resumo do Pedido (Carrinho) ===== */}
      <Dialog open={step === "cart"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">Resumo do Pedido</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
            {cart.map((item) => (
              <div key={item.key} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}x {formatBRL(item.unit_price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.key, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm w-5 text-center text-foreground">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.key, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium text-foreground w-20 text-right">
                    {formatBRL(item.quantity * item.unit_price)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-4 py-3 space-y-3">
            {/* Payment */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-8 text-xs bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Transferência"].map((m) => (
                    <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatBRL(total)}</span>
              </div>
              {isCardPayment && cardTaxPercent > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa cartão ({cardTaxPercent}%)</span>
                  <span className="text-destructive">-{formatBRL(cardFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-1">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatBRL(total)}</span>
              </div>
              {isCardPayment && cardTaxPercent > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Líquido (após taxa)</span>
                  <span className="text-emerald-500">{formatBRL(total - cardFee)}</span>
                </div>
              )}
            </div>

            <Button onClick={goToCustomer} className="w-full gap-2" size="sm">
              Finalizar Pedido
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL 3: Dados do Cliente ===== */}
      <Dialog open={step === "customer"} onOpenChange={(open) => !open && setStep("cart")}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Dados do Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Search existing */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Buscar cliente existente</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={custSearch}
                  onChange={(e) => {
                    setCustSearch(e.target.value);
                    setSelectedCustomerId(null);
                  }}
                  placeholder="Buscar por nome ou WhatsApp..."
                  className="h-8 text-sm pl-9 bg-background border-border"
                />
              </div>
              {custSearch && filteredCustomers.length > 0 && !selectedCustomer && (
                <div className="border border-border rounded-md bg-card max-h-32 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustSearch("");
                        setCustName(c.name);
                        setCustWhatsapp(c.whatsapp || "");
                        setCustCpf(c.cpf || "");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between"
                    >
                      <span className="text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.whatsapp || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer ? (
              <div className="p-3 bg-card border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedCustomer.whatsapp, selectedCustomer.cpf].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setCustName("");
                      setCustWhatsapp("");
                      setCustCpf("");
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Separator className="bg-border" />
                <p className="text-xs text-muted-foreground">Ou cadastre um novo cliente:</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nome *</Label>
                    <Input
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="Nome do cliente"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">WhatsApp</Label>
                    <Input
                      value={custWhatsapp}
                      onChange={(e) => setCustWhatsapp(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="(11) 99999-9999"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">CPF</Label>
                    <Input
                      value={custCpf}
                      onChange={(e) => setCustCpf(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={handleFinalize}
              disabled={(!custName.trim() && !selectedCustomerId) || createSale.isPending}
              className="w-full gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Salvar Pedido — {formatBRL(total)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
