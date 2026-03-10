import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CalendarIcon,
  Receipt,
  Repeat,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useFixedExpenses,
  useCreateFixedExpense,
  useUpdateFixedExpense,
  useDeleteFixedExpense,
  useVariableExpenses,
  useCreateVariableExpense,
  useDeleteVariableExpense,
} from "@/hooks/useExpenses";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Schemas
const fixedSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  notes: z.string().max(500).optional(),
});

const variableSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  expense_date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export default function Gastos() {
  const { data: fixedExpenses = [], isLoading: fixedLoading } = useFixedExpenses();
  const { data: variableExpenses = [], isLoading: varLoading } = useVariableExpenses();
  const createFixed = useCreateFixedExpense();
  const updateFixed = useUpdateFixedExpense();
  const deleteFixed = useDeleteFixedExpense();
  const createVariable = useCreateVariableExpense();
  const deleteVariable = useDeleteVariableExpense();

  const [tab, setTab] = useState("fixed");
  const [fixedModal, setFixedModal] = useState(false);
  const [varModal, setVarModal] = useState(false);

  // Variable expenses month filter
  const now = new Date();
  const [varMonth, setVarMonth] = useState(now.getMonth());
  const [varYear, setVarYear] = useState(now.getFullYear());

  // Fixed form state
  const [fName, setFName] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fNotes, setFNotes] = useState("");

  // Variable form state
  const [vName, setVName] = useState("");
  const [vAmount, setVAmount] = useState("");
  const [vDate, setVDate] = useState("");
  const [vNotes, setVNotes] = useState("");

  const resetFixedForm = () => { setFName(""); setFAmount(""); setFNotes(""); };
  const resetVarForm = () => { setVName(""); setVAmount(""); setVDate(""); setVNotes(""); };

  // Filter variable expenses by month
  const filteredVariable = useMemo(() => {
    return variableExpenses.filter((e) => {
      const d = new Date(e.expense_date + "T00:00:00");
      return d.getMonth() === varMonth && d.getFullYear() === varYear;
    });
  }, [variableExpenses, varMonth, varYear]);

  const varTotal = useMemo(() => filteredVariable.reduce((s, e) => s + Number(e.amount), 0), [filteredVariable]);
  const fixedTotal = useMemo(() => fixedExpenses.filter((e) => e.active).reduce((s, e) => s + Number(e.amount), 0), [fixedExpenses]);

  const handleCreateFixed = () => {
    const result = fixedSchema.safeParse({ name: fName, amount: fAmount, notes: fNotes || undefined });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    createFixed.mutate(
      { name: result.data.name, amount: result.data.amount, notes: result.data.notes || null },
      {
        onSuccess: () => { setFixedModal(false); resetFixedForm(); toast.success("Gasto fixo adicionado"); },
      }
    );
  };

  const handleCreateVariable = () => {
    const result = variableSchema.safeParse({ name: vName, amount: vAmount, expense_date: vDate || undefined, notes: vNotes || undefined });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    createVariable.mutate(
      {
        name: result.data.name,
        amount: result.data.amount,
        expense_date: result.data.expense_date || undefined,
        notes: result.data.notes || null,
      },
      {
        onSuccess: () => { setVarModal(false); resetVarForm(); toast.success("Gasto variável adicionado"); },
      }
    );
  };

  const prevMonth = () => {
    if (varMonth === 0) { setVarMonth(11); setVarYear((y) => y - 1); }
    else setVarMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (varMonth === 11) { setVarMonth(0); setVarYear((y) => y + 1); }
    else setVarMonth((m) => m + 1);
  };

  const isLoading = fixedLoading || varLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Gestão de Gastos</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Repeat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Gastos Fixos / mês</p>
            <p className="text-xl font-semibold text-foreground">{formatBRL(fixedTotal)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Variáveis — {MONTHS[varMonth]}
            </p>
            <p className="text-xl font-semibold text-foreground">{formatBRL(varTotal)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="fixed" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Repeat className="h-3.5 w-3.5 mr-1.5" />
            Fixos
          </TabsTrigger>
          <TabsTrigger value="variable" className="text-xs data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Variáveis
          </TabsTrigger>
        </TabsList>

        {/* ─── FIXED EXPENSES ─── */}
        <TabsContent value="fixed" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {fixedExpenses.filter((e) => e.active).length} gasto(s) ativo(s)
            </p>
            <Button size="sm" onClick={() => setFixedModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">Nome</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Valor / mês</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : fixedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Nenhum gasto fixo cadastrado</TableCell>
                  </TableRow>
                ) : (
                  fixedExpenses.map((expense) => (
                    <TableRow key={expense.id} className={`border-border ${!expense.active ? "opacity-40" : ""}`}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{expense.name}</p>
                          {expense.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{expense.notes}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium text-foreground">{formatBRL(Number(expense.amount))}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => updateFixed.mutate({ id: expense.id, active: !expense.active })}
                          className="inline-flex items-center gap-1 text-xs transition-colors"
                        >
                          {expense.active ? (
                            <>
                              <ToggleRight className="h-5 w-5 text-emerald-500" />
                              <span className="text-emerald-500">Ativo</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                              <span className="text-muted-foreground">Inativo</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteFixed.mutate(expense.id, { onSuccess: () => toast.success("Removido") })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── VARIABLE EXPENSES ─── */}
        <TabsContent value="variable" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            {/* Month navigator */}
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-1">
              <button onClick={prevMonth} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
                {MONTHS[varMonth]} {varYear}
              </span>
              <button onClick={nextMonth} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button size="sm" onClick={() => setVarModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">Nome</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Data</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Valor</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : filteredVariable.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum gasto variável em {MONTHS[varMonth]}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVariable.map((expense) => (
                    <TableRow key={expense.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{expense.name}</p>
                          {expense.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{expense.notes}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(expense.expense_date + "T00:00:00"), "dd/MM", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium text-foreground">{formatBRL(Number(expense.amount))}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteVariable.mutate(expense.id, { onSuccess: () => toast.success("Removido") })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredVariable.length > 0 && (
            <div className="flex justify-end">
              <div className="bg-card border border-border rounded-lg px-4 py-2">
                <span className="text-xs text-muted-foreground mr-3">Total do mês</span>
                <span className="text-sm font-semibold text-foreground">{formatBRL(varTotal)}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: New Fixed Expense ─── */}
      <Dialog open={fixedModal} onOpenChange={(o) => { setFixedModal(o); if (!o) resetFixedForm(); }}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Gasto Fixo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm">Nome *</Label>
              <Input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder="Ex: Aluguel, Internet, Funcionário..."
                className="bg-card border-border h-9 text-sm"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Valor mensal (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                placeholder="0,00"
                className="bg-card border-border h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Observação</Label>
              <Textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder="Opcional..."
                className="bg-card border-border text-sm min-h-[60px] resize-none"
                maxLength={500}
              />
            </div>
            <Button onClick={handleCreateFixed} className="w-full" size="sm" disabled={createFixed.isPending}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: New Variable Expense ─── */}
      <Dialog open={varModal} onOpenChange={(o) => { setVarModal(o); if (!o) resetVarForm(); }}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Gasto Variável</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm">Nome *</Label>
              <Input
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="Ex: Manutenção, Frete, Compra de material..."
                className="bg-card border-border h-9 text-sm"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={vAmount}
                onChange={(e) => setVAmount(e.target.value)}
                placeholder="0,00"
                className="bg-card border-border h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Data</Label>
              <Input
                type="date"
                value={vDate}
                onChange={(e) => setVDate(e.target.value)}
                className="bg-card border-border h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Se não informada, usará a data de hoje</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Observação</Label>
              <Textarea
                value={vNotes}
                onChange={(e) => setVNotes(e.target.value)}
                placeholder="Opcional..."
                className="bg-card border-border text-sm min-h-[60px] resize-none"
                maxLength={500}
              />
            </div>
            <Button onClick={handleCreateVariable} className="w-full" size="sm" disabled={createVariable.isPending}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
