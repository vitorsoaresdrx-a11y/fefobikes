import { useState } from "react";
import { CreditCard, Save, HardHat, Plus, Power, Lock, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCardTaxes,
  useUpdateCardTaxes,
  useStationPasswords,
  useUpdateStationPasswords,
  useSalaoNames,
  useUpdateSalaoNames,
  type StationPasswords,
} from "@/hooks/useSettings";
import { useMechanics, useCreateMechanic, useToggleMechanic } from "@/hooks/useMechanics";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

export default function Configuracoes() {
  const { toast } = useToast();
  const { data: taxes, isLoading } = useCardTaxes();
  const updateTaxes = useUpdateCardTaxes();
  const { data: permsData } = useMyPermissions();
  const isOwner = permsData?.isOwner ?? false;

  // Card settings
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [creditTax, setCreditTax] = useState<number | null>(null);
  const [debitTax, setDebitTax] = useState<number | null>(null);
  const effectiveCredit = creditTax ?? taxes?.credit_tax ?? 0;
  const effectiveDebit = debitTax ?? taxes?.debit_tax ?? 0;

  // Mechanics settings
  const [showMechanicsSettings, setShowMechanicsSettings] = useState(false);
  const [newMechanicName, setNewMechanicName] = useState("");
  const { data: mechanics = [] } = useMechanics();
  const createMechanic = useCreateMechanic();
  const toggleMechanic = useToggleMechanic();

  // Station passwords settings
  const [showStationSettings, setShowStationSettings] = useState(false);
  const { data: stationPasswords } = useStationPasswords();
  const updateStationPasswords = useUpdateStationPasswords();
  const [stationPwds, setStationPwds] = useState<StationPasswords | null>(null);
  const effectiveStationPwds: StationPasswords = stationPwds ?? stationPasswords ?? { admin: "", salao: "", mecanica: "" };

  // Salão names settings
  const [showSalaoNames, setShowSalaoNames] = useState(false);
  const { data: salaoNames = [] } = useSalaoNames();
  const updateSalaoNames = useUpdateSalaoNames();
  const [newSalaoName, setNewSalaoName] = useState("");

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

  const handleAddMechanic = async () => {
    if (!newMechanicName.trim()) return;
    try {
      await createMechanic.mutateAsync(newMechanicName.trim());
      toast({ title: "Mecânico adicionado" });
      setNewMechanicName("");
    } catch {
      toast({ title: "Erro ao adicionar mecânico", variant: "destructive" });
    }
  };

  const handleSaveStationPasswords = async () => {
    try {
      await updateStationPasswords.mutateAsync(effectiveStationPwds);
      toast({ title: "Senhas das estações salvas" });
      setStationPwds(null);
    } catch {
      toast({ title: "Erro ao salvar senhas", variant: "destructive" });
    }
  };

  const handleAddSalaoName = async () => {
    const name = newSalaoName.trim();
    if (!name) return;
    if (salaoNames.includes(name)) {
      toast({ title: "Nome já cadastrado", variant: "destructive" });
      return;
    }
    try {
      await updateSalaoNames.mutateAsync([...salaoNames, name]);
      toast({ title: "Nome adicionado" });
      setNewSalaoName("");
    } catch {
      toast({ title: "Erro ao adicionar nome", variant: "destructive" });
    }
  };

  const handleRemoveSalaoName = async (name: string) => {
    try {
      await updateSalaoNames.mutateAsync(salaoNames.filter((n) => n !== name));
      toast({ title: "Nome removido" });
    } catch {
      toast({ title: "Erro ao remover nome", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl space-y-6 pb-24 lg:pb-0">
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

      {/* Mechanics settings - Owner only */}
      {isOwner && (
        <>
          {!showMechanicsSettings ? (
            <button
              type="button"
              onClick={() => setShowMechanicsSettings(true)}
              className="w-full text-left p-4 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <HardHat className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Mecânicos</p>
                  <p className="text-xs text-muted-foreground">
                    Gerencie os mecânicos cadastrados no sistema
                  </p>
                </div>
              </div>
              <div className="mt-3 ml-[52px]">
                <span className="text-xs text-muted-foreground">
                  {mechanics.filter((m) => m.active).length} ativo(s) de {mechanics.length} cadastrado(s)
                </span>
              </div>
            </button>
          ) : (
            <div className="border border-border rounded-lg bg-card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <HardHat className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Mecânicos</p>
                  <p className="text-xs text-muted-foreground">
                    Adicione ou desative mecânicos
                  </p>
                </div>
              </div>

              {/* Add new mechanic */}
              <div className="flex gap-2 ml-[52px]">
                <Input
                  placeholder="Nome do mecânico"
                  value={newMechanicName}
                  onChange={(e) => setNewMechanicName(e.target.value)}
                  className="bg-background border-border h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddMechanic()}
                />
                <Button size="sm" className="gap-1.5 shrink-0" onClick={handleAddMechanic} disabled={createMechanic.isPending}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>

              {/* List */}
              <div className="ml-[52px] space-y-2">
                {mechanics.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${m.active ? "border-border bg-background" : "border-border/50 bg-muted/10 opacity-60"}`}
                  >
                    <span className={`text-sm font-medium ${m.active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {m.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => toggleMechanic.mutate({ id: m.id, active: !m.active })}
                      disabled={toggleMechanic.isPending}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {m.active ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                ))}
                {mechanics.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum mecânico cadastrado</p>
                )}
              </div>

              <div className="ml-[52px]">
                <Button variant="outline" size="sm" onClick={() => setShowMechanicsSettings(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Station Logins - Owner only */}
          {!showStationSettings ? (
            <button
              type="button"
              onClick={() => setShowStationSettings(true)}
              className="w-full text-left p-4 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <MonitorSmartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Estações de Login</p>
                  <p className="text-xs text-muted-foreground">
                    Configure os emails de acesso para cada estação (Admin, Salão, Mecânica)
                  </p>
                </div>
              </div>
              {stationLogins && (stationLogins.admin || stationLogins.salao || stationLogins.mecanica) && (
                <div className="flex flex-col gap-1 mt-3 ml-[52px]">
                  {stationLogins.admin && (
                    <span className="text-xs text-muted-foreground">
                      Admin: <span className="text-foreground font-medium">{stationLogins.admin}</span>
                    </span>
                  )}
                  {stationLogins.salao && (
                    <span className="text-xs text-muted-foreground">
                      Salão: <span className="text-foreground font-medium">{stationLogins.salao}</span>
                    </span>
                  )}
                  {stationLogins.mecanica && (
                    <span className="text-xs text-muted-foreground">
                      Mecânica: <span className="text-foreground font-medium">{stationLogins.mecanica}</span>
                    </span>
                  )}
                </div>
              )}
            </button>
          ) : (
            <div className="border border-border rounded-lg bg-card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <MonitorSmartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Estações de Login</p>
                  <p className="text-xs text-muted-foreground">
                    Cada estação usa um email de conta criada em Permissões
                  </p>
                </div>
              </div>

              <div className="space-y-3 ml-[52px]">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email Administração</Label>
                  <Input
                    type="email"
                    value={effectiveStationEmails.admin}
                    onChange={(e) =>
                      setStationEmails({ ...effectiveStationEmails, admin: e.target.value })
                    }
                    className="bg-background border-border h-9 text-sm"
                    placeholder="admin@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Email Salão</Label>
                  <Input
                    type="email"
                    value={effectiveStationEmails.salao}
                    onChange={(e) =>
                      setStationEmails({ ...effectiveStationEmails, salao: e.target.value })
                    }
                    className="bg-background border-border h-9 text-sm"
                    placeholder="salao@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Email Mecânica</Label>
                  <Input
                    type="email"
                    value={effectiveStationEmails.mecanica}
                    onChange={(e) =>
                      setStationEmails({ ...effectiveStationEmails, mecanica: e.target.value })
                    }
                    className="bg-background border-border h-9 text-sm"
                    placeholder="mecanica@email.com"
                  />
                </div>
              </div>

              <div className="flex gap-2 ml-[52px]">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSaveStationLogins}
                  disabled={updateStationLogins.isPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowStationSettings(false);
                    setStationEmails(null);
                  }}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Salão Names - Owner only */}
          {!showSalaoNames ? (
            <button
              type="button"
              onClick={() => setShowSalaoNames(true)}
              className="w-full text-left p-4 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nomes do Salão</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastre os nomes dos operadores que aparecem ao entrar no Salão
                  </p>
                </div>
              </div>
              {salaoNames.length > 0 && (
                <div className="mt-3 ml-[52px]">
                  <span className="text-xs text-muted-foreground">
                    {salaoNames.length} nome(s): {salaoNames.join(", ")}
                  </span>
                </div>
              )}
            </button>
          ) : (
            <div className="border border-border rounded-lg bg-card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nomes do Salão</p>
                  <p className="text-xs text-muted-foreground">
                    Esses nomes aparecem na tela de login quando alguém entra como Salão
                  </p>
                </div>
              </div>

              {/* Add new name */}
              <div className="flex gap-2 ml-[52px]">
                <Input
                  placeholder="Nome do operador"
                  value={newSalaoName}
                  onChange={(e) => setNewSalaoName(e.target.value)}
                  className="bg-background border-border h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSalaoName()}
                />
                <Button
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={handleAddSalaoName}
                  disabled={updateSalaoNames.isPending}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>

              {/* List */}
              <div className="ml-[52px] space-y-2">
                {salaoNames.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                  >
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemoveSalaoName(name)}
                      disabled={updateSalaoNames.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>
                ))}
                {salaoNames.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum nome cadastrado
                  </p>
                )}
              </div>

              <div className="ml-[52px]">
                <Button variant="outline" size="sm" onClick={() => setShowSalaoNames(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
