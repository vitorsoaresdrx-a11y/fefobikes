import { useState, useMemo } from "react";
import { Search, ShoppingCart, Plus, Minus, UserPlus, X, Bike, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useBikeModels } from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
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
  quantity: number;
  unit_price: number;
}

export default function PDV() {
  const { toast } = useToast();
  const { data: customers = [] } = useCustomers();
  const { data: bikes = [] } = useBikeModels();
  const { data: parts = [] } = useParts();
  const { data: cardTaxes } = useCardTaxes();
  const createCustomer = useCreateCustomer();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [saleNotes, setSaleNotes] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTab, setCatalogTab] = useState("bikes");

  // Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustWhatsapp, setNewCustWhatsapp] = useState("");
  const [newCustCpf, setNewCustCpf] = useState("");

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cart]
  );

  const isCardPayment = paymentMethod === "cartão de crédito" || paymentMethod === "cartão de débito";
  const cardTaxPercent = isCardPayment
    ? paymentMethod === "cartão de crédito"
      ? cardTaxes?.credit_tax || 0
      : cardTaxes?.debit_tax || 0
    : 0;
  const cardFee = total * (cardTaxPercent / 100);

  // Filtered catalog
  const filteredBikes = useMemo(() => {
    if (!catalogSearch.trim()) return bikes;
    const q = catalogSearch.toLowerCase();
    return bikes.filter((b) => b.name.toLowerCase().includes(q) || (b.category && b.category.toLowerCase().includes(q)));
  }, [bikes, catalogSearch]);

  const filteredParts = useMemo(() => {
    if (!catalogSearch.trim()) return parts;
    const q = catalogSearch.toLowerCase();
    return parts.filter((p) => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
  }, [parts, catalogSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.whatsapp && c.whatsapp.includes(q))
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const addToCart = (id: string, type: "bike" | "part", name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && i.type === type);
      if (existing) {
        return prev.map((i) =>
          i.id === id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { key: crypto.randomUUID(), id, type, name, quantity: 1, unit_price: price }];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const getCartQty = (id: string, type: "bike" | "part") => {
    return cart.find((i) => i.id === id && i.type === type)?.quantity || 0;
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const created = await createCustomer.mutateAsync({
        name: newCustName.trim(),
        whatsapp: newCustWhatsapp.trim() || null,
        cpf: newCustCpf.trim() || null,
      });
      setSelectedCustomerId(created.id);
      setNewCustOpen(false);
      setNewCustName("");
      setNewCustWhatsapp("");
      setNewCustCpf("");
      toast({ title: "Cliente cadastrado" });
    } catch {
      toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
    }
  };

  const handleFinishSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }
    try {
      await createSale.mutateAsync({
        customer_id: selectedCustomerId,
        total,
        payment_method: paymentMethod,
        notes: saleNotes.trim() || null,
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
      setSelectedCustomerId(null);
      setSaleNotes("");
      setPaymentMethod("dinheiro");
    } catch {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl">
      <h1 className="text-lg font-semibold text-foreground mb-4">Ponto de Venda</h1>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Catalog */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Customer bar */}
          <div className="flex gap-2 mb-3">
            {selectedCustomer ? (
              <div className="flex-1 flex items-center justify-between px-3 py-2 bg-card border border-border rounded-md">
                <div>
                  <span className="text-sm font-medium text-foreground">{selectedCustomer.name}</span>
                  {selectedCustomer.whatsapp && (
                    <span className="text-xs text-muted-foreground ml-2">{selectedCustomer.whatsapp}</span>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedCustomerId(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="bg-card border-border h-8 text-sm pl-9"
                />
                {customerSearch && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 top-9 left-0 right-0 border border-border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between"
                      >
                        <span className="text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.whatsapp || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Dialog open={newCustOpen} onOpenChange={setNewCustOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  <UserPlus className="h-3.5 w-3.5" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Novo Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nome *</Label>
                    <Input value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="h-9 text-sm" placeholder="Nome do cliente" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">WhatsApp</Label>
                    <Input value={newCustWhatsapp} onChange={(e) => setNewCustWhatsapp(e.target.value)} className="h-9 text-sm" placeholder="(11) 99999-9999" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">CPF</Label>
                    <Input value={newCustCpf} onChange={(e) => setNewCustCpf(e.target.value)} className="h-9 text-sm" placeholder="000.000.000-00" maxLength={14} />
                  </div>
                  <Button onClick={handleCreateCustomer} disabled={!newCustName.trim() || createCustomer.isPending} className="w-full" size="sm">
                    Cadastrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search + Tabs */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="bg-card border-border h-9 text-sm pl-9"
            />
          </div>

          <Tabs value={catalogTab} onValueChange={setCatalogTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="bg-muted/30 h-8 mb-2">
              <TabsTrigger value="bikes" className="text-xs gap-1 h-6">
                <Bike className="h-3 w-3" /> Bikes ({filteredBikes.length})
              </TabsTrigger>
              <TabsTrigger value="parts" className="text-xs gap-1 h-6">
                <Wrench className="h-3 w-3" /> Peças ({filteredParts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bikes" className="flex-1 overflow-y-auto m-0 space-y-1.5">
              {filteredBikes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma bike encontrada</p>
              ) : (
                filteredBikes.map((bike) => {
                  const qty = getCartQty(bike.id, "bike");
                  const price = Number((bike as any).sale_price) || 0;
                  return (
                    <div key={bike.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-card hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bike.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {bike.category && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{bike.category}</Badge>}
                          <span className="text-xs text-muted-foreground">{formatBRL(price)}</span>
                        </div>
                      </div>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(cart.find((i) => i.id === bike.id && i.type === "bike")!.key, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center text-foreground">{qty}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addToCart(bike.id, "bike", bike.name, price)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addToCart(bike.id, "bike", bike.name, price)}>
                          <Plus className="h-3 w-3" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="parts" className="flex-1 overflow-y-auto m-0 space-y-1.5">
              {filteredParts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma peça encontrada</p>
              ) : (
                filteredParts.map((part) => {
                  const qty = getCartQty(part.id, "part");
                  const price = Number((part as any).unit_cost) || 0;
                  return (
                    <div key={part.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-card hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{part.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {part.category && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{part.category}</Badge>}
                          <span className="text-xs text-muted-foreground">{formatBRL(price)}</span>
                        </div>
                      </div>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(cart.find((i) => i.id === part.id && i.type === "part")!.key, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center text-foreground">{qty}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addToCart(part.id, "part", part.name, price)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addToCart(part.id, "part", part.name, price)}>
                          <Plus className="h-3 w-3" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Cart panel */}
        <div className="lg:w-80 flex flex-col border border-border rounded-lg bg-card">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                Carrinho ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 max-h-[300px] lg:max-h-none">
            {cart.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Carrinho vazio</p>
            ) : (
              cart.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1.5">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}x {formatBRL(item.unit_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatBRL(item.quantity * item.unit_price)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => updateQty(item.key, -item.quantity)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-3 space-y-3">
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

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="bg-background border-border text-xs min-h-[32px] h-8 resize-none"
                placeholder="Obs..."
                maxLength={500}
              />
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
              <div className="flex justify-between text-base font-semibold pt-1">
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

            <Button
              onClick={handleFinishSale}
              disabled={cart.length === 0 || createSale.isPending}
              className="w-full gap-2"
              size="sm"
            >
              <ShoppingCart className="h-4 w-4" />
              Fechar Venda
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
