import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarDays,
  Timer,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  name: string;
  department: string | null;
  active: boolean;
}

interface TimeRecord {
  id: string;
  employee_id: string;
  type: string;
  timestamp: string;
  date: string;
  confidence: number | null;
}

interface DaySummary {
  date: Date;
  hoursWorked: number;
  breakMinutes: number;
  clockIn: string | null;
  clockOut: string | null;
  records: TimeRecord[];
  isAbsent: boolean;
  isWeekend: boolean;
}

interface EmployeeSummary {
  employee: Employee;
  days: DaySummary[];
  totalHours: number;
  totalBreakMinutes: number;
  daysWorked: number;
  absences: number;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export default function PontoRelatorio() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const workDays = useMemo(() => daysInMonth.filter((d) => !isWeekend(d) && d <= new Date()), [daysInMonth]);

  const prevMonth = () => setCurrentMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() - 1)));
  const nextMonth = () => setCurrentMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + 1)));

  // Use string keys for stable dependency
  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);

    const [empRes, recRes] = await Promise.all([
      supabase.from("employees").select("id, name, department, active").eq("active", true).order("name"),
      supabase
        .from("time_records")
        .select("id, employee_id, type, timestamp, date, confidence")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("timestamp", { ascending: true }),
    ]);

    setEmployees(empRes.data || []);
    setRecords(recRes.data || []);
    setLoading(false);
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaries: EmployeeSummary[] = useMemo(() => {
    return employees.map((emp) => {
      const empRecords = records.filter((r) => r.employee_id === emp.id);

      const days: DaySummary[] = daysInMonth.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayRecords = empRecords.filter((r) => r.date === dayStr).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let hoursWorked = 0;
        let breakMinutes = 0;
        let clockIn: string | null = null;
        let clockOut: string | null = null;

        let lastIn: Date | null = null;
        let lastBreakOut: Date | null = null;

        for (const r of dayRecords) {
          const ts = new Date(r.timestamp);
          if (r.type === "clock_in") {
            if (!clockIn) clockIn = format(ts, "HH:mm");
            lastIn = ts;
          } else if (r.type === "clock_out") {
            clockOut = format(ts, "HH:mm");
            if (lastIn) {
              hoursWorked += (ts.getTime() - lastIn.getTime()) / 3600000;
              lastIn = null;
            }
          } else if (r.type === "break_out") {
            if (lastIn) {
              hoursWorked += (ts.getTime() - lastIn.getTime()) / 3600000;
              lastIn = null;
            }
            lastBreakOut = ts;
          } else if (r.type === "break_in") {
            if (lastBreakOut) {
              breakMinutes += (ts.getTime() - lastBreakOut.getTime()) / 60000;
              lastBreakOut = null;
            }
            lastIn = ts;
          }
        }

        // If still clocked in today
        if (lastIn && isSameDay(day, new Date())) {
          hoursWorked += (Date.now() - lastIn.getTime()) / 3600000;
        }
        if (lastBreakOut && isSameDay(day, new Date())) {
          breakMinutes += (Date.now() - lastBreakOut.getTime()) / 60000;
        }

        const weekend = isWeekend(day);
        const isPast = day < new Date() && !isSameDay(day, new Date());
        const isAbsent = !weekend && isPast && dayRecords.length === 0;

        return { date: day, hoursWorked, breakMinutes, clockIn, clockOut, records: dayRecords, isAbsent, isWeekend: weekend };
      });

      const totalHours = days.reduce((sum, d) => sum + d.hoursWorked, 0);
      const totalBreakMinutes = days.reduce((sum, d) => sum + d.breakMinutes, 0);
      const daysWorked = days.filter((d) => d.records.length > 0).length;
      const absences = days.filter((d) => d.isAbsent).length;

      return { employee: emp, days, totalHours, totalBreakMinutes, daysWorked, absences };
    });
  }, [employees, records, daysInMonth]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-card border border-border flex items-center justify-center shadow-2xl">
              <CalendarDays size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none mb-1">
                Relatório de Ponto
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Controle de frequência mensal
              </p>
            </div>
          </div>
        </header>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth} className="p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors">
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <div className="bg-card border border-border rounded-2xl px-8 py-4 min-w-[260px] text-center">
            <p className="text-xl font-black text-foreground uppercase tracking-tight capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              {workDays.length} dias úteis
            </p>
          </div>
          <button
            onClick={nextMonth}
            disabled={startOfMonth(new Date()).getTime() <= currentMonth.getTime()}
            className="p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Summary Cards */}
        {!loading && summaries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-[24px] p-6 space-y-1">
              <Users size={18} className="text-primary" />
              <p className="text-2xl font-black text-foreground">{employees.length}</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Funcionários</p>
            </div>
            <div className="bg-card border border-border rounded-[24px] p-6 space-y-1">
              <Timer size={18} className="text-emerald-400" />
              <p className="text-2xl font-black text-foreground">
                {formatDuration(summaries.reduce((s, e) => s + e.totalHours * 60, 0) / Math.max(employees.length, 1))}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Média Horas/Func.</p>
            </div>
            <div className="bg-card border border-border rounded-[24px] p-6 space-y-1">
              <Coffee size={18} className="text-amber-400" />
              <p className="text-2xl font-black text-foreground">
                {formatDuration(summaries.reduce((s, e) => s + e.totalBreakMinutes, 0) / Math.max(employees.length, 1))}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Média Intervalo</p>
            </div>
            <div className="bg-card border border-border rounded-[24px] p-6 space-y-1">
              <AlertTriangle size={18} className="text-destructive" />
              <p className="text-2xl font-black text-foreground">
                {summaries.reduce((s, e) => s + e.absences, 0)}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Faltas</p>
            </div>
          </div>
        )}

        {/* Employee List */}
        {!loading && summaries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">Nenhum funcionário cadastrado</p>
          </div>
        )}

        {!loading && summaries.map((summary) => (
          <div key={summary.employee.id} className="bg-card border border-border rounded-[32px] overflow-hidden">
            {/* Employee Header */}
            <button
              onClick={() => setExpandedEmployee(expandedEmployee === summary.employee.id ? null : summary.employee.id)}
              className="w-full p-6 flex items-center gap-5 hover:bg-muted/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-lg font-black text-foreground tracking-tight">{summary.employee.name}</p>
                {summary.employee.department && (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {summary.employee.department}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-black text-foreground">{formatDuration(summary.totalHours * 60)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Trabalhadas</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-black text-foreground">{summary.daysWorked}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Dias</p>
                </div>
                {summary.absences > 0 && (
                  <div className="flex items-center gap-1 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full">
                    <AlertTriangle size={12} />
                    <span className="text-[10px] font-black uppercase">{summary.absences} falta{summary.absences > 1 ? "s" : ""}</span>
                  </div>
                )}
                <ChevronRight
                  size={18}
                  className={`text-muted-foreground transition-transform ${expandedEmployee === summary.employee.id ? "rotate-90" : ""}`}
                />
              </div>
            </button>

            {/* Expanded Daily Detail */}
            {expandedEmployee === summary.employee.id && (
              <div className="border-t border-border">
                {/* Mobile summary */}
                <div className="grid grid-cols-3 gap-4 p-4 md:hidden border-b border-border">
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground">{formatDuration(summary.totalHours * 60)}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Horas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground">{formatDuration(summary.totalBreakMinutes)}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Intervalo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground">{summary.daysWorked}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Dias</p>
                  </div>
                </div>

                {/* Days table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Dia</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Entrada</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Saída</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Horas</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Intervalo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.days.filter((d) => d.date <= new Date() || d.records.length > 0).map((day) => {
                        const dayNum = format(day.date, "dd");
                        const dayName = format(day.date, "EEE", { locale: ptBR });

                        return (
                          <tr
                            key={day.date.toISOString()}
                            className={`border-b border-border/50 ${
                              day.isWeekend ? "opacity-40" : day.isAbsent ? "bg-destructive/5" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span className="font-black text-foreground">{dayNum}</span>
                              <span className="text-muted-foreground ml-1 text-xs capitalize">{dayName}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {day.isWeekend ? (
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Fim de Semana</span>
                              ) : day.isAbsent ? (
                                <span className="inline-flex items-center gap-1 text-destructive text-[9px] font-black uppercase">
                                  <XCircle size={12} /> Faltou
                                </span>
                              ) : day.records.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[9px] font-black uppercase">
                                  <CheckCircle2 size={12} /> Presente
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-foreground tabular-nums">
                              {day.clockIn || "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-foreground tabular-nums">
                              {day.clockOut || "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-black text-foreground tabular-nums">
                              {day.hoursWorked > 0 ? formatDuration(day.hoursWorked * 60) : "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-amber-400 tabular-nums">
                              {day.breakMinutes > 0 ? formatDuration(day.breakMinutes) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="px-4 py-3 font-black text-foreground text-[10px] uppercase" colSpan={2}>
                          Total do Mês
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-center font-black text-primary tabular-nums">
                          {formatDuration(summary.totalHours * 60)}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-amber-400 tabular-nums">
                          {formatDuration(summary.totalBreakMinutes)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
