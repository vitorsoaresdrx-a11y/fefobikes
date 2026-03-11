import { useState, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  ClipboardPlus,
  Package,
  Bike as BikeIcon,
  CreditCard,
  DollarSign,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  UserPlus,
  ChevronRight,
  Banknote,
} from "lucide-react";
import { useBikeModels } from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useCreateSale } from "@/hooks/useSales";
import { useCardTaxes } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { SaleReceipt, type ReceiptData } from "@/components/pdv/SaleReceipt";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}) => {
  const v = {
    primary: "bg-[#2952FF] text-white hover:bg-[#4A6FFF] shadow-[0_0_20px_rgba(41,82,255,0.3)]",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800",
    destructive: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  };
  const s = {
    sm: "h-9 px-4 text-xs font-bold",
    md: "h-12 px-6 text-sm font-bold",
    lg: "h-14 px-8 rounded-2xl text-base font-black uppercase tracking-widest",
    icon: "h-10 w-10 flex items-center justify-center rounded-xl",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const InputEl = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full bg-[#161618] border border-zinc-800 rounded-2xl px-4 text-zinc-100 outline-none focus:border-[#2952FF] transition-all placeholder:text-zinc-600 ${className}`}
    {...props}
  />
);

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "active" | "outline" }) {
  const styles =
    variant === "active"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : variant === "outline"
      ? "bg-zinc-800/60 text-zinc-400 border-zinc-700"
      : "bg-zinc-800 text-zinc-500 border-zinc-700";
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles}`}>{children}</span>;
}

function PaymentCard({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-24 rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all ${
        active
          ? "bg-[#2952FF]/10 border-[#2952FF] text-white shadow-[0_0_20px_rgba(41,82,255,0.2)]"
          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── PDV ──────────────────────────────────────────────────────────────────────

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

  // Catalog
  const [catalogTab, setCatalogTab] = useState<"parts" | "bikes">("parts");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("todas");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("pix");

  // Customer
  const [custSearch, setCustSearch] = useState("");
  const [custName, setCustName] = useState("");
  const [custWhatsapp, setCustWhatsapp] = useState("");
  const [custCpf, setCustCpf] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0), [cart]);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isCardPayment = paymentMethod === "cartão de crédito" || paymentMethod === "cartão de débito";
  const cardTaxPercent = isCardPayment
    ? paymentMethod === "cartão de crédito"
      ? cardTaxes?.credit_tax || 0
      : cardTaxes?.debit_tax || 0
    : 0;
  const cardFee = total * (cardTaxPercent / 100);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    parts.forEach((p) => p.category && cats.add(p.category));
    return Array.from(cats).sort();
  }, [parts]);

  const catalogItems = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    const source = catalogTab === "parts" ? parts : bikes;
    return (source as any[]).filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
      const matchCat = catalogCategory === "todas" || item.category === catalogCategory;
      return matchSearch && matchCat;
    });
  }, [parts, bikes, catalogSearch, catalogCategory, catalogTab]);

  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return [];
    const q = custSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.whatsapp && c.whatsapp.includes(q)))
      .slice(0, 6);
  }, [customers, custSearch]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // ── Cart actions ───────────────────────────────────────────────────────────

  const addToCart = (id: string, type: "bike" | "part", name: string, price: number, category: string | null) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && i.type === type);
      if (existing) return prev.map((i) => (i.id === id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { key: crypto.randomUUID(), id, type, name, category, quantity: 1, unit_price: price }];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (key: string) => setCart((prev) => prev.filter((i) => i.key !== key));

  const getCartQty = (id: string, type: "bike" | "part") =>
    cart.find((i) => i.id === id && i.type === type)?.quantity || 0;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const openCatalog = () => {
    setCatalogSearch("");
    setCatalogCategory("todas");
    setStep("catalog");
  };

  const goToCustomer = () => {
    setCustName("");
    setCustWhatsapp("");
    setCustCpf("");
    setCustSearch("");
    setSelectedCustomerId(null);
    setStep("customer");
  };

  // ── Finalize ───────────────────────────────────────────────────────────────

  const handleFinalize = async () => {
    try {
      let customerId = selectedCustomerId;

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
      setPaymentMethod("pix");
    } catch {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30 pb-40">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2952FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#2952FF]">CHECKOUT EXPRESS</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Ponto de Venda</h1>
          </div>
          <Btn variant="primary" size="lg" onClick={openCatalog}>
            <Plus className="w-5 h-5 mr-2 stroke-[3]" />
            Adicionar Itens
          </Btn>
        </header>

        {/* Carrinho / Empty State */}
        {cart.length === 0 ? (
          <div className="py-32 flex flex-col items-center text-center space-y-6 bg-[#161618] border border-dashed border-zinc-800 rounded-[40px]">
            <div className="w-20 h-20 bg-zinc-900 rounded-[30px] flex items-center justify-center text-zinc-700">
              <Package size={40} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-zinc-300">Carrinho Vazio</h4>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">Inicie uma nova venda selecionando produtos do catálogo.</p>
            </div>
            <Btn variant="outline" className="px-10" onClick={openCatalog}>Abrir Catálogo</Btn>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-4">
              <h3 className="font-bold text-lg text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={18} /> Itens Selecionados
              </h3>
              <span className="text-xs font-black text-[#2952FF] bg-[#2952FF]/10 px-3 py-1 rounded-full">
                {itemCount} Unidades
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {cart.map((item) => (
                <div
                  key={item.key}
                  className="group bg-[#161618] border border-zinc-800 rounded-[32px] p-6 flex items-center justify-between hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-600 shrink-0">
                      {item.type === "bike" ? <BikeIcon size={32} /> : <Package size={32} />}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{item.name}</h4>
                      <p className="text-sm text-zinc-500 font-medium">{formatBRL(item.unit_price)} por unidade</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:gap-8">
                    <div className="flex items-center bg-[#0A0A0B] rounded-2xl p-1 border border-zinc-800">
                      <Btn variant="ghost" size="icon" onClick={() => updateQty(item.key, -1)}><Minus size={16} /></Btn>
                      <span className="w-10 text-center font-black text-white">{item.quantity}</span>
                      <Btn variant="ghost" size="icon" onClick={() => updateQty(item.key, 1)}><Plus size={16} /></Btn>
                    </div>
                    <div className="text-right min-w-[100px] hidden sm:block">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Subtotal</p>
                      <p className="text-xl font-black text-white">{formatBRL(item.quantity * item.unit_price)}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Btn variant="outline" className="w-full h-12" onClick={openCatalog}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar mais itens
            </Btn>
          </div>
        )}
      </div>

      {/* Barra flutuante — estilo iFood */}
      {cart.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-[#1C1C1E]/80 backdrop-blur-2xl border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[32px] p-4 flex items-center justify-between z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-6 px-4">
            <div className="relative">
              <div className="w-12 h-12 bg-[#2952FF] rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShoppingCart size={20} />
              </div>
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-[#2952FF] rounded-full flex items-center justify-center text-xs font-black shadow-xl">
                {itemCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total do Pedido</p>
              <p className="text-2xl font-black text-white tracking-tighter">{formatBRL(total)}</p>
            </div>
          </div>
          <Btn variant="primary" size="lg" className="h-16 px-12" onClick={() => setStep("cart")}>
            Revisar e Pagar <ArrowRight className="ml-2 w-5 h-5" />
          </Btn>
        </div>
      )}

      {/* ── MODAL 1: Catálogo ─────────────────────────────────────────────── */}
      {step === "catalog" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="h-full flex flex-col max-w-5xl mx-auto p-6 space-y-6">

            <header className="flex items-center justify-between">
              <button
                onClick={() => setStep("idle")}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
              >
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold uppercase text-xs tracking-widest">Voltar ao PDV</span>
              </button>
              <h2 className="text-2xl font-black text-white">Catálogo de Produtos</h2>
              <div className="w-24" />
            </header>

            {/* Search + Tabs */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <InputEl
                  autoFocus
                  placeholder="Busque por nome ou categoria..."
                  className="h-14 pl-12 pr-4"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
              <div className="flex p-1 bg-[#161618] rounded-2xl border border-zinc-800 shrink-0">
                <button
                  onClick={() => { setCatalogTab("parts"); setCatalogCategory("todas"); }}
                  className={`px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${catalogTab === "parts" ? "bg-[#2C2C2E] text-white" : "text-zinc-500"}`}
                >
                  Peças
                </button>
                <button
                  onClick={() => { setCatalogTab("bikes"); setCatalogCategory("todas"); }}
                  className={`px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${catalogTab === "bikes" ? "bg-[#2C2C2E] text-white" : "text-zinc-500"}`}
                >
                  Bikes
                </button>
              </div>
            </div>

            {/* Category chips — só peças */}
            {catalogTab === "parts" && categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {["todas", ...categories].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border ${
                      catalogCategory === cat
                        ? "bg-[#2952FF]/10 border-[#2952FF] text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    {cat === "todas" ? "Todas" : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Grid de itens */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {catalogItems.length === 0 ? (
                <div className="col-span-3 py-20 text-center text-zinc-600 text-sm">Nenhum item encontrado</div>
              ) : (
                catalogItems.map((item: any) => {
                  const isBike = catalogTab === "bikes";
                  const type = isBike ? "bike" : "part";
                  const price = Number(item.sale_price) || 0;
                  const qty = getCartQty(item.id, type as "bike" | "part");

                  return (
                    <div
                      key={item.id}
                      className="bg-[#161618] border border-zinc-800 rounded-[32px] p-6 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all"
                    >
                      <div className="space-y-3">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full aspect-square rounded-2xl object-cover border border-zinc-800"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-800 border border-zinc-800">
                            {isBike ? <BikeIcon size={64} /> : <Package size={64} />}
                          </div>
                        )}
                        <div>
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                          <h4 className="text-lg font-bold text-white mt-1">{item.name}</h4>
                          <p className="text-xl font-black text-[#2952FF] mt-1">{formatBRL(price)}</p>
                          {!isBike && (
                            <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest">
                              Estoque: {item.stock_qty}
                            </p>
                          )}
                        </div>
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center justify-between bg-[#0A0A0B] rounded-2xl p-1 border border-zinc-800">
                          <Btn variant="ghost" size="icon" onClick={() => updateQty(cart.find((i) => i.id === item.id && i.type === type)!.key, -1)}>
                            <Minus size={16} />
                          </Btn>
                          <span className="font-black text-white">{qty}</span>
                          <Btn variant="ghost" size="icon" onClick={() => addToCart(item.id, type as "bike" | "part", item.name, price, item.category)}>
                            <Plus size={16} />
                          </Btn>
                        </div>
                      ) : (
                        <Btn
                          variant="secondary"
                          className="w-full"
                          onClick={() => addToCart(item.id, type as "bike" | "part", item.name, price, item.category)}
                        >
                          <Plus className="mr-2 w-4 h-4" /> Adicionar
                        </Btn>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer do catálogo */}
            <div className="p-6 bg-[#1C1C1E] border border-zinc-800 rounded-[32px] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2952FF]/10 text-[#2952FF] rounded-2xl flex items-center justify-center">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pedido atual</p>
                  <p className="font-black text-white">{itemCount} itens · {formatBRL(total)}</p>
                </div>
              </div>
              <Btn variant="primary" size="lg" className="px-12" onClick={() => setStep("idle")}>
                Concluir Seleção
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Pagamento ────────────────────────────────────────────── */}
      {step === "cart" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-6">
          <div className="bg-[#1C1C1E] w-full max-w-2xl rounded-[40px] border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-10 space-y-8">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white">Finalizar Venda</h2>
                  <p className="text-zinc-500 text-sm">Escolha a forma de pagamento</p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Payment cards visuais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PaymentCard active={paymentMethod === "pix"} onClick={() => setPaymentMethod("pix")} icon={Zap} label="PIX" />
                <PaymentCard active={paymentMethod === "dinheiro"} onClick={() => setPaymentMethod("dinheiro")} icon={DollarSign} label="Dinheiro" />
                <PaymentCard active={paymentMethod === "cartão de crédito"} onClick={() => setPaymentMethod("cartão de crédito")} icon={CreditCard} label="Crédito" />
                <PaymentCard active={paymentMethod === "cartão de débito"} onClick={() => setPaymentMethod("cartão de débito")} icon={CreditCard} label="Débito" />
              </div>

              {/* Resumo financeiro */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Resumo Financeiro</span>
                  <Badge variant="active">Pagamento Seguro</Badge>
                </div>
                <div className="space-y-2">
                  {/* Itens do carrinho */}
                  {cart.map((item) => (
                    <div key={item.key} className="flex justify-between text-zinc-400 text-sm">
                      <span>{item.name} ×{item.quantity}</span>
                      <span>{formatBRL(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-zinc-800 my-2" />
                  <div className="flex justify-between text-zinc-400 text-sm">
                    <span>Subtotal</span>
                    <span>{formatBRL(total)}</span>
                  </div>
                  {isCardPayment && cardTaxPercent > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Taxa cartão ({cardTaxPercent}%)</span>
                      <span className="text-red-400">-{formatBRL(cardFee)}</span>
                    </div>
                  )}
                  <div className="h-px bg-zinc-800 my-2" />
                  <div className="flex justify-between items-end text-white">
                    <span className="font-bold">Valor Total</span>
                    <span className="text-3xl font-black tracking-tighter">{formatBRL(total)}</span>
                  </div>
                  {isCardPayment && cardTaxPercent > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Líquido (após taxa)</span>
                      <span className="text-emerald-400">{formatBRL(total - cardFee)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Btn variant="ghost" className="flex-1 h-16" onClick={() => setStep("idle")}>Revisar Itens</Btn>
                <Btn variant="primary" className="flex-[2] h-16" onClick={goToCustomer}>
                  Identificar Cliente <ArrowRight className="ml-2" />
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Cliente ──────────────────────────────────────────────── */}
      {step === "customer" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-6">
          <div className="bg-[#1C1C1E] w-full max-w-md rounded-[40px] border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-10 space-y-8">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Identificação</h2>
                <button onClick={() => setStep("cart")} className="text-zinc-500 hover:text-white transition-colors">
                  <ArrowLeft />
                </button>
              </div>

              <div className="space-y-4">
                {/* Busca de cliente existente */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <InputEl
                    placeholder="Buscar cliente por nome ou WhatsApp..."
                    className="h-14 pl-12 pr-4"
                    value={custSearch}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setSelectedCustomerId(null);
                    }}
                  />
                </div>

                {/* Resultados da busca */}
                {custSearch && filteredCustomers.length > 0 && !selectedCustomer && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustSearch("");
                          setCustName(c.name);
                          setCustWhatsapp(c.whatsapp || "");
                          setCustCpf((c as any).cpf || "");
                        }}
                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between ${
                          selectedCustomerId === c.id
                            ? "bg-[#2952FF]/10 border-[#2952FF] text-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white">{c.name}</p>
                          <p className="text-[10px] uppercase tracking-widest">{c.whatsapp}</p>
                        </div>
                        {selectedCustomerId === c.id && <CheckCircle2 className="text-[#2952FF]" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Cliente selecionado */}
                {selectedCustomer && (
                  <div className="p-4 bg-[#2952FF]/10 border border-[#2952FF]/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                        {[selectedCustomer.whatsapp, (selectedCustomer as any).cpf].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedCustomerId(null); setCustName(""); setCustWhatsapp(""); setCustCpf(""); }}
                      className="text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                    >
                      Trocar
                    </button>
                  </div>
                )}

                {/* Divisor */}
                {!selectedCustomer && (
                  <>
                    <div className="flex items-center gap-2 text-zinc-600">
                      <div className="h-px flex-1 bg-zinc-800" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Ou novo cliente</span>
                      <div className="h-px flex-1 bg-zinc-800" />
                    </div>

                    <div className="space-y-3">
                      <InputEl
                        placeholder="Nome *"
                        className="h-12 px-4"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        maxLength={100}
                      />
                      <InputEl
                        placeholder="WhatsApp (11) 99999-9999"
                        className="h-12 px-4"
                        value={custWhatsapp}
                        onChange={(e) => setCustWhatsapp(e.target.value)}
                        maxLength={20}
                      />
                      <InputEl
                        placeholder="CPF 000.000.000-00"
                        className="h-12 px-4"
                        value={custCpf}
                        onChange={(e) => setCustCpf(e.target.value)}
                        maxLength={14}
                      />
                    </div>
                  </>
                )}
              </div>

              <Btn
                variant="primary"
                size="lg"
                className="w-full h-16"
                onClick={handleFinalize}
                disabled={(!custName.trim() && !selectedCustomerId) || createSale.isPending}
              >
                Finalizar Venda — {formatBRL(total)}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
