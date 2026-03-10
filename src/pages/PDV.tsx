import { useState, useMemo } from "react";
import { z } from "zod";
import { Plus, Trash2, ShoppingCart, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useCustomers, useCreateCustomer, Customer } from "@/hooks/useCustomers";
import { useBikeModels } from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
import { useCreateSale, SaleItem } from "@/hooks/useSales";
import { useToast } from "@/hooks/use-toast";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const cpfSchema = z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido").or(z.literal("")).optional();
const whatsappSchema = z.string().max(20).optional();

interface CartItem {
  key: string;
  description: string;
  quantity: number;
  unit_price: number;
  bike_model_id?: string | null;
  part_id?: string | null;
}

export default function PDV() {
  const { toast } = useToast();
  const { data: customers = [] } = useCustomers();
  const { data: bikes = [] } = useBikeModels();
  const { data: parts = [] } = useParts();
  const createCustomer = useCreateCustomer();
  const createSale = useCreateSale();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("dinheiro");
  const [saleNotes, setSaleNotes] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // New customer dialog
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustWhatsapp, setNewCustWhatsapp] = useState("");
  const [newCustCpf, setNewCustCpf] = useState("");

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cart]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.cpf && c.cpf.includes(q))
    );
  }, [customers, customerSearch]);

  const addBikeToCart = (bikeId: string) => {
    const bike = bikes.find((b) => b.id === bikeId);
    if (!bike) return;
    setCart((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        description: bike.name,
        quantity: 1,
        unit_price: Number((bike as any).sale_price) || 0,
        bike_model_id: bike.id,
      },
    ]);
  };

  const addPartToCart = (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    setCart((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        description: part.name,
        quantity: 1,
        unit_price: Number((part as any).unit_cost) || 0,
        part_id: part.id,
      },
    ]);
  };

  const addCustomItem = () => {
    setCart((prev) => [
      ...prev,
      { key: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const updateCartItem = (key: string, updates: Partial<CartItem>) => {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, ...updates } : i)));
  };

  const removeCartItem = (key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  };

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
        items: cart.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          bike_model_id: item.bike_model_id || null,
          part_id: item.part_id || null,
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

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Ponto de Venda</h1>

      {/* Cliente */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Cliente
        </h3>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Buscar cliente por nome, WhatsApp ou CPF..."
              className="bg-card border-border h-9 text-sm pl-9"
            />
          </div>
          <Dialog open={newCustOpen} onOpenChange={setNewCustOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9">
                <UserPlus className="h-4 w-4" />
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
                  <Input
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Nome do cliente"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">WhatsApp</Label>
                  <Input
                    value={newCustWhatsapp}
                    onChange={(e) => setNewCustWhatsapp(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="(11) 99999-9999"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">CPF</Label>
                  <Input
                    value={newCustCpf}
                    onChange={(e) => setNewCustCpf(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={!newCustName.trim() || createCustomer.isPending}
                  className="w-full"
                  size="sm"
                >
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Customer list / selection */}
        {customerSearch && filteredCustomers.length > 0 && !selectedCustomer && (
          <div className="border border-border rounded-md bg-card max-h-40 overflow-y-auto">
            {filteredCustomers.slice(0, 8).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustomerSearch("");
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex justify-between items-center"
              >
                <span className="text-foreground">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.whatsapp || ""}</span>
              </button>
            ))}
          </div>
        )}

        {selectedCustomer && (
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-md">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedCustomer.name}</p>
              <p className="text-xs text-muted-foreground">
                {[selectedCustomer.whatsapp, selectedCustomer.cpf].filter(Boolean).join(" • ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setSelectedCustomerId(null)}
            >
              Trocar
            </Button>
          </div>
        )}
      </section>

      <Separator className="bg-border" />

      {/* Itens */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Itens da venda
          </h3>
          <div className="flex gap-1.5">
            <Select onValueChange={addBikeToCart}>
              <SelectTrigger className="h-7 text-xs w-auto gap-1 bg-card border-border">
                <SelectValue placeholder="+ Bike" />
              </SelectTrigger>
              <SelectContent>
                {bikes.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={addPartToCart}>
              <SelectTrigger className="h-7 text-xs w-auto gap-1 bg-card border-border">
                <SelectValue placeholder="+ Peça" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addCustomItem}>
              <Plus className="h-3 w-3" />
              Avulso
            </Button>
          </div>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum item adicionado
          </p>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.key} className="flex items-center gap-2 p-3 border border-border rounded-md bg-card">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={item.description}
                    onChange={(e) => updateCartItem(item.key, { description: e.target.value })}
                    className="bg-background border-border h-8 text-sm"
                    placeholder="Descrição do item"
                    maxLength={200}
                  />
                  <div className="flex gap-2">
                    <div className="w-16">
                      <Label className="text-xs text-muted-foreground">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateCartItem(item.key, { quantity: parseInt(e.target.value) || 1 })
                        }
                        className="bg-background border-border h-8 text-xs"
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-muted-foreground">Preço unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.unit_price || ""}
                        onChange={(e) =>
                          updateCartItem(item.key, {
                            unit_price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="bg-background border-border h-8 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Subtotal</Label>
                      <div className="h-8 flex items-center text-xs text-muted-foreground">
                        {formatBRL(item.quantity * item.unit_price)}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeCartItem(item.key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <div className="flex justify-between items-center px-3 py-2 bg-card border border-border rounded-md">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-base font-semibold text-foreground">{formatBRL(total)}</span>
            </div>
          </div>
        )}
      </section>

      <Separator className="bg-border" />

      {/* Pagamento */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pagamento
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-card border-border h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Transferência"].map(
                  (m) => (
                    <SelectItem key={m} value={m.toLowerCase()}>
                      {m}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Observações</Label>
            <Textarea
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              className="bg-card border-border text-sm min-h-[36px] h-9 resize-none"
              placeholder="Obs. da venda..."
              maxLength={500}
            />
          </div>
        </div>
      </section>

      {/* Finalizar */}
      <Button
        onClick={handleFinishSale}
        disabled={cart.length === 0 || createSale.isPending}
        className="w-full gap-2"
        size="lg"
      >
        <ShoppingCart className="h-4 w-4" />
        Finalizar Venda — {formatBRL(total)}
      </Button>
    </div>
  );
}
