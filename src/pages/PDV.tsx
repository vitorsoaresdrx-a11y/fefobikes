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
import { useCurrentCashRegister, useLinkSaleToCashRegister } from "@/hooks/useCashRegister";

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { formatBRL } from "@/lib/format";

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
      className={`h-16 md:h-24 rounded-2xl md:rounded-3xl border flex flex-col items-center justify-center gap-1.5 md:gap-2 transition-all ${
        active
          ? "bg-[#2952FF]/10 border-[#2952FF] text-white shadow-[0_0_20px_rgba(41,82,255,0.2)]"
          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
      }`}
    >
      <Icon size={18} />
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{label}</span>
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
  const { data: currentCashRegister } = useCurrentCashRegister();
  const linkSaleToCash = useLinkSaleToCashRegister();

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

  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
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
    const qDigits = custSearch.replace(/\D/g, "");
    return customers
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.cpf && c.cpf.replace(/\D/g, "").includes(qDigits))
      )
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

      const sale = await createSale.mutateAsync({
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

      // Link to cash register if payment is cash and register is open
      if (paymentMethod === "dinheiro") {
        if (currentCashRegister?.status === "open") {
          await linkSaleToCash.mutateAsync({
            cashRegisterId: currentCashRegister.id,
            saleId: sale.id,
            amount: total,
          });
        } else {
          toast({ title: "Atenção: nenhum caixa aberto. A venda foi registrada mas não vinculada ao caixa.", variant: "destructive" });
        }
      }

      // Build receipt data from current PDV state
      const finalCustomerName = selectedCustomer?.name || custName.trim() || undefined;
      const finalWhatsapp = selectedCustomer?.whatsapp || custWhatsapp.trim() || undefined;

      const receipt: ReceiptData = {
        orderNumber: sale.id.slice(-4).toUpperCase(),
        timestamp: new Date(),
        customerName: finalCustomerName,
        customerWhatsapp: finalWhatsapp,
        items: cart.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
        subtotal: total,
        discount: 0,
        total,
        paymentMethod,
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setStep("idle");

      toast({ title: "Venda registrada com sucesso!" });
    } catch {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setCart([]);
    setPaymentMethod("pix");
    setSelectedCustomerId(null);
    setCustName("");
    setCustWhatsapp("");
    setCustCpf("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#2952FF]/30 pb-20 md:pb-40">
      <div className="max-w-5xl mx-auto w-full p-4 lg:p-8 space-y-3 md:space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2 md:gap-3 mb-1">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#2952FF] rounded-xl md:rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(41,82,255,0.3)]">
                <ShoppingCart size={16} className="md:hidden text-white" />
                <ShoppingCart size={20} className="hidden md:block text-white" />
              </div>
              <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-[#2952FF]">
                Checkout Express
              </span>
            </div>
            <h1 className="text-lg md:text-2xl lg:text-4xl font-extrabold tracking-tight">Ponto de Venda</h1>
          </div>
          <Btn variant="primary" size="sm" className="w-full md:w-auto md:!h-14 md:!px-8 md:!text-base md:font-black md:uppercase md:tracking-widest h-10 text-sm px-4" onClick={openCatalog}>
            <Plus className="w-4 h-4 mr-1 md:w-5 md:h-5 md:mr-2 stroke-[3]" />
            Adicionar Itens
          </Btn>
        </header>

        {/* Carrinho / Empty State */}
        {cart.length === 0 ? (
          <div className="py-20 md:py-32 flex flex-col items-center text-center space-y-4 md:space-y-6 bg-[#161618] border border-dashed border-zinc-800 rounded-2xl md:rounded-[40px]">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900 rounded-2xl md:rounded-[30px] flex items-center justify-center text-zinc-700">
              <Package size={32} className="md:hidden" />
              <Package size={40} className="hidden md:block" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base md:text-xl font-bold text-zinc-300">Carrinho Vazio</h4>
              <p className="text-xs md:text-sm text-zinc-500 max-w-xs mx-auto">Inicie uma nova venda selecionando produtos do catálogo.</p>
            </div>
            <Btn variant="outline" className="px-8 h-10 text-sm" onClick={openCatalog}>Abrir Catálogo</Btn>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-2 md:px-4">
              <h3 className="text-xs md:text-lg font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="md:hidden" />
                <Layers size={18} className="hidden md:block" />
                Itens Selecionados
              </h3>
              <span className="text-[10px] md:text-xs font-black text-[#2952FF] bg-[#2952FF]/10 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full">
                {itemCount} Unidades
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:gap-4">
              {cart.map((item) => (
                <div
                  key={item.key}
                  className="group bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] p-3 md:p-6 flex items-center gap-2 md:gap-6 hover:border-zinc-700 transition-all"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 md:w-16 md:h-16 bg-zinc-900 rounded-lg md:rounded-2xl flex items-center justify-center text-zinc-600 shrink-0">
                    {item.type === "bike" ? <BikeIcon size={16} className="md:hidden" /> : <Package size={16} className="md:hidden" />}
                    {item.type === "bike" ? <BikeIcon size={32} className="hidden md:block" /> : <Package size={32} className="hidden md:block" />}
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-xl font-bold text-white truncate max-w-[120px] md:max-w-none">{item.name}</h4>
                    <p className="text-xs md:text-sm text-zinc-500 font-medium">{formatBRL(item.unit_price)}/un</p>
                    <p className="text-xs font-black text-white md:hidden mt-0.5">{formatBRL(item.quantity * item.unit_price)}</p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 md:gap-0 bg-[#0A0A0B] rounded-lg md:rounded-2xl p-0.5 md:p-1 border border-zinc-800 shrink-0">
                    <Btn variant="ghost" size="icon" className="!h-6 !w-6 md:!h-10 md:!w-10 !rounded-lg" onClick={() => updateQty(item.key, -1)}><Minus size={12} className="md:hidden" /><Minus size={14} className="hidden md:block" /></Btn>
                    <span className="w-5 md:w-10 text-center font-black text-white text-sm">{item.quantity}</span>
                    <Btn variant="ghost" size="icon" className="!h-6 !w-6 md:!h-10 md:!w-10 !rounded-lg" onClick={() => updateQty(item.key, 1)}><Plus size={12} className="md:hidden" /><Plus size={14} className="hidden md:block" /></Btn>
                  </div>

                  {/* Subtotal desktop */}
                  <div className="text-right min-w-[100px] hidden md:block">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Subtotal</p>
                    <p className="text-xl font-black text-white">{formatBRL(item.quantity * item.unit_price)}</p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.key)}
                    className="p-1 md:p-2 text-zinc-700 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X size={14} className="md:hidden" />
                    <X size={20} className="hidden md:block" />
                  </button>
                </div>
              ))}
            </div>

            <Btn variant="outline" className="w-full h-10 md:h-12 text-sm" onClick={openCatalog}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar mais itens
            </Btn>
          </div>
        )}
      </div>

      {/* Barra flutuante — estilo iFood */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 md:bottom-8 left-1/2 -translate-x-1/2 w-full md:w-[90%] max-w-4xl bg-[#1C1C1E]/95 backdrop-blur-2xl border-t md:border border-white/5 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] md:shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:rounded-[32px] h-16 md:h-auto px-4 md:p-4 flex items-center justify-between z-50 animate-in slide-in-from-bottom-10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center gap-3 md:gap-6 md:px-4">
            <div className="relative shrink-0 hidden md:block">
              <div className="w-12 h-12 bg-[#2952FF] rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShoppingCart size={18} />
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white text-[#2952FF] rounded-full flex items-center justify-center text-xs font-black shadow-xl">
                {itemCount}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total</p>
              <p className="text-sm md:text-2xl font-bold md:font-black text-white tracking-tighter">{formatBRL(total)}</p>
            </div>
          </div>
          <Btn variant="primary" size="sm" className="h-10 px-6 text-sm font-black md:!h-16 md:!px-12 md:!text-base" onClick={() => setStep("cart")}>
            <span className="hidden md:inline">Revisar e Pagar</span>
            <span className="md:hidden">Pagar</span>
            <ArrowRight className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
          </Btn>
        </div>
      )}

      {/* ── MODAL 1: Catálogo ─────────────────────────────────────────────── */}
      {step === "catalog" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="h-full flex flex-col max-w-5xl mx-auto p-3 md:p-6 space-y-3 md:space-y-6">

            <header className="flex items-center gap-3">
              <button
                onClick={() => setStep("idle")}
                className="flex items-center gap-1.5 md:gap-2 text-zinc-500 hover:text-white transition-colors group shrink-0"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold uppercase text-[10px] md:text-xs tracking-widest hidden md:inline">Voltar ao PDV</span>
              </button>
              <h2 className="text-lg md:text-2xl font-bold md:font-black text-white">Catálogo de Produtos</h2>
            </header>

            {/* Search + Tabs */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <InputEl
                  autoFocus
                  placeholder="Busque por nome ou categoria..."
                  className="h-10 md:h-14 pl-11 pr-4 text-sm"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
              <div className="flex p-1 bg-[#161618] rounded-xl md:rounded-2xl border border-zinc-800 shrink-0 self-start">
                <button
                  onClick={() => { setCatalogTab("parts"); setCatalogCategory("todas"); }}
                  className={`px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${catalogTab === "parts" ? "bg-[#2C2C2E] text-white" : "text-zinc-500"}`}
                >
                  Peças
                </button>
                <button
                  onClick={() => { setCatalogTab("bikes"); setCatalogCategory("todas"); }}
                  className={`px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${catalogTab === "bikes" ? "bg-[#2C2C2E] text-white" : "text-zinc-500"}`}
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
                    className={`shrink-0 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all border ${
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
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
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
                      className="bg-[#161618] border border-zinc-800 rounded-2xl md:rounded-[32px] p-3 md:p-6 flex flex-col justify-between space-y-2 md:space-y-4 hover:border-zinc-700 transition-all"
                    >
                      <div className="space-y-2 md:space-y-3">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full h-32 md:aspect-square rounded-xl md:rounded-2xl object-cover border border-zinc-800"
                          />
                        ) : (
                          <div className="w-full h-32 md:aspect-square bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-800 border border-zinc-800">
                            {isBike ? <BikeIcon size={32} className="md:hidden" /> : <Package size={32} className="md:hidden" />}
                            {isBike ? <BikeIcon size={64} className="hidden md:block" /> : <Package size={64} className="hidden md:block" />}
                          </div>
                        )}
                        <div>
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                          <h4 className="text-sm md:text-lg font-bold text-white mt-1 truncate">{item.name}</h4>
                          <p className="text-sm md:text-xl font-bold md:font-black text-[#2952FF] mt-0.5 md:mt-1">{formatBRL(price)}</p>
                          {!isBike && (
                            <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest">
                              Estoque: {item.stock_qty}
                            </p>
                          )}
                        </div>
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center justify-between bg-[#0A0A0B] rounded-xl md:rounded-2xl p-1 border border-zinc-800">
                          <Btn variant="ghost" size="icon" className="!h-7 !w-7 md:!h-10 md:!w-10" onClick={() => updateQty(cart.find((i) => i.id === item.id && i.type === type)!.key, -1)}>
                            <Minus size={14} />
                          </Btn>
                          <span className="font-black text-white text-sm">{qty}</span>
                          <Btn variant="ghost" size="icon" className="!h-7 !w-7 md:!h-10 md:!w-10" onClick={() => addToCart(item.id, type as "bike" | "part", item.name, price, item.category)}>
                            <Plus size={14} />
                          </Btn>
                        </div>
                      ) : (
                        <Btn
                          variant="secondary"
                          className="w-full h-8 text-xs md:h-12 md:text-sm"
                          onClick={() => addToCart(item.id, type as "bike" | "part", item.name, price, item.category)}
                        >
                          <Plus className="mr-1 w-3 h-3 md:mr-2 md:w-4 md:h-4" /> Adicionar
                        </Btn>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer do catálogo */}
            <div className="p-3 md:p-6 bg-[#1C1C1E] border border-zinc-800 rounded-2xl md:rounded-[32px] flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <div className="w-9 h-9 md:w-12 md:h-12 bg-[#2952FF]/10 text-[#2952FF] rounded-lg md:rounded-2xl flex items-center justify-center shrink-0">
                  <ShoppingCart size={16} className="md:hidden" />
                  <ShoppingCart size={18} className="hidden md:block" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pedido</p>
                  <p className="font-bold md:font-black text-white text-sm md:text-base truncate">{itemCount} itens · {formatBRL(total)}</p>
                </div>
              </div>
              <Btn variant="primary" size="sm" className="px-4 md:!px-12 h-10 md:!h-14 text-xs md:!text-base shrink-0 font-black" onClick={() => setStep("idle")}>
                <span className="hidden md:inline">Concluir Seleção</span>
                <span className="md:hidden">Concluir</span>
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Pagamento ────────────────────────────────────────────── */}
      {step === "cart" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-[#1C1C1E] w-full max-w-2xl rounded-t-3xl md:rounded-[40px] border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8 max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl lg:text-3xl font-black text-white">Finalizar Venda</h2>
                  <p className="text-zinc-500 text-xs md:text-sm">Escolha a forma de pagamento</p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Payment cards visuais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <PaymentCard active={paymentMethod === "pix"} onClick={() => setPaymentMethod("pix")} icon={Zap} label="PIX" />
                <PaymentCard active={paymentMethod === "dinheiro"} onClick={() => setPaymentMethod("dinheiro")} icon={DollarSign} label="Dinheiro" />
                <PaymentCard active={paymentMethod === "cartão de crédito"} onClick={() => setPaymentMethod("cartão de crédito")} icon={CreditCard} label="Crédito" />
                <PaymentCard active={paymentMethod === "cartão de débito"} onClick={() => setPaymentMethod("cartão de débito")} icon={CreditCard} label="Débito" />
              </div>

              {/* Resumo financeiro */}
              <div className="p-4 md:p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl md:rounded-3xl space-y-3 md:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold text-[10px] md:text-xs uppercase tracking-widest">Resumo Financeiro</span>
                  <Badge variant="active">Pagamento Seguro</Badge>
                </div>
                <div className="space-y-2">
                  {/* Itens do carrinho */}
                  {cart.map((item) => (
                    <div key={item.key} className="flex justify-between text-zinc-400 text-xs md:text-sm">
                      <span className="truncate mr-2">{item.name} ×{item.quantity}</span>
                      <span className="shrink-0">{formatBRL(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-zinc-800 my-2" />
                  <div className="flex justify-between text-zinc-400 text-xs md:text-sm">
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
                    <span className="font-bold text-sm">Valor Total</span>
                    <span className="text-lg md:text-xl lg:text-3xl font-black tracking-tighter">{formatBRL(total)}</span>
                  </div>
                  {isCardPayment && cardTaxPercent > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Líquido (após taxa)</span>
                      <span className="text-emerald-400">{formatBRL(total - cardFee)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 md:gap-4">
                <Btn variant="ghost" className="flex-1 h-10 md:h-16 text-sm" onClick={() => setStep("idle")}>Revisar Itens</Btn>
                <Btn variant="primary" className="flex-[2] h-10 md:h-16 text-sm" onClick={goToCustomer}>
                  Identificar Cliente <ArrowRight className="ml-1 md:ml-2 w-4 h-4" />
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
            <div className="p-6 lg:p-8 space-y-6 lg:space-y-8 max-h-[90vh] overflow-y-auto">

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
                    placeholder="Buscar por nome, WhatsApp ou CPF..."
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
                          <p className="text-[10px] uppercase tracking-widest">
                            {[c.whatsapp, c.cpf].filter(Boolean).join(" · ")}
                          </p>
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
                size="sm"
                className="w-full h-10 md:!h-16 md:!text-base md:font-black md:uppercase md:tracking-widest text-sm font-bold"
                onClick={handleFinalize}
                disabled={(!custName.trim() && !selectedCustomerId) || createSale.isPending}
              >
                Finalizar Venda — {formatBRL(total)}
              </Btn>
            </div>
          </div>
        </div>
      )}
      {/* ── Receipt Modal ─────────────────────────────────────────────── */}
      {receiptData && (
        <SaleReceipt
          open={showReceipt}
          onClose={handleCloseReceipt}
          data={receiptData}
        />
      )}
    </div>
  );
}
