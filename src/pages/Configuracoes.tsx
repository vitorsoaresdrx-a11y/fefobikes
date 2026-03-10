import { useState } from "react";
import { CreditCard, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCardTaxes, useUpdateCardTaxes } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

export default function Configuracoes() {
  const { toast } = useToast();
  const { data: taxes, isLoading } = useCardTaxes();
  const updateTaxes = useUpdateCardTaxes();

  const [showCardSettings, setShowCardSettings] = useState(false);
  const [creditTax, setCreditTax] = useState<number | null>(null);
  const [debitTax, setDebitTax] = useState<number | null>(null);

  const effectiveCredit = creditTax ?? taxes?.credit_tax ?? 0;
  const effectiveDebit = debitTax ?? taxes?.debit_tax ?? 0;

  const handleSaveTaxes = async () => {
    try {
      await updateTaxes.mutateAsync({
        credit_tax: effectiveCredit,
        debit_tax: effectiveDebit,
      });
      toast({ title: "Taxas atualizadas com sucesso" });
      setCreditTax(null);
      setDebitTax(null);
    } catch {
      toast({ title: "Erro ao salvar taxas", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Configurações</h1>

      {/* Card taxes card */}
      {!showCardSettings ? (
        <button
          type="button"
          onClick={() => setShowCardSettings(true)}
          className="w-full text-left p-4 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Central do Cartão</p>
              <p className="text-xs text-muted-foreground">
                Configure as taxas de crédito e débito da maquininha
              </p>
            </div>
          </div>
          {!isLoading && taxes && (
            <div className="flex gap-4 mt-3 ml-[52px]">
              <span className="text-xs text-muted-foreground">
                Crédito: <span className="text-foreground font-medium">{taxes.credit_tax}%</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Débito: <span className="text-foreground font-medium">{taxes.debit_tax}%</span>
              </span>
            </div>
          )}
        </button>
      ) : (
        <div className="border border-border rounded-lg bg-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Central do Cartão</p>
              <p className="text-xs text-muted-foreground">
                As taxas serão aplicadas automaticamente ao fechar vendas no cartão
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 ml-[52px]">
            <div className="space-y-1.5">
              <Label className="text-sm">Taxa Crédito (%)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={effectiveCredit}
                onChange={(e) => setCreditTax(parseFloat(e.target.value) || 0)}
                className="bg-background border-border h-9 text-sm"
                placeholder="Ex: 4.99"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Taxa Débito (%)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={effectiveDebit}
                onChange={(e) => setDebitTax(parseFloat(e.target.value) || 0)}
                className="bg-background border-border h-9 text-sm"
                placeholder="Ex: 1.99"
              />
            </div>
          </div>

          <div className="flex gap-2 ml-[52px]">
            <Button size="sm" className="gap-1.5" onClick={handleSaveTaxes} disabled={updateTaxes.isPending}>
              <Save className="h-3.5 w-3.5" />
              Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowCardSettings(false); setCreditTax(null); setDebitTax(null); }}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
