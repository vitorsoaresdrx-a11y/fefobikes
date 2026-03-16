import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw, Users, Loader2, AlertTriangle } from "lucide-react";

export default function EmployeeList({ refreshKey, onReRegister }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, department, active, face_embeddings(id)")
      .eq("active", true)
      .order("name");
    setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshKey]);

  const handleDelete = async (emp) => {
    setDeleting(emp.id);
    try {
      // Delete face embeddings first (cascade should handle, but be explicit)
      await supabase.from("face_embeddings").delete().eq("employee_id", emp.id);
      // Soft-delete: mark inactive
      await supabase.from("employees").update({ active: false }).eq("id", emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      setConfirmId(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleReRegister = (emp) => {
    onReRegister?.({ name: emp.name, email: emp.email, department: emp.department || "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm font-bold">Carregando funcionários...</span>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-bold opacity-50">Nenhum funcionário cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
          <Users size={12} /> Funcionários Cadastrados ({employees.length})
        </h2>
        <button
          onClick={fetchEmployees}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-background border border-border rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{emp.name}</p>
              <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
              {emp.department && (
                <p className="text-[10px] text-muted-foreground/60 truncate">{emp.department}</p>
              )}
              <p className={`text-[10px] font-bold mt-1 ${emp.face_embeddings ? "text-emerald-400" : "text-amber-400"}`}>
                {emp.face_embeddings ? "✓ Rosto cadastrado" : "⚠ Sem rosto"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleReRegister(emp)}
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-xl border border-primary/20 hover:bg-primary/5"
                title="Recadastrar rosto"
              >
                <RefreshCw size={14} />
              </button>

              {confirmId === emp.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(emp)}
                    disabled={deleting === emp.id}
                    className="text-xs font-bold text-white bg-destructive rounded-xl px-3 py-2 hover:bg-destructive/80 transition-colors disabled:opacity-50"
                  >
                    {deleting === emp.id ? <Loader2 size={14} className="animate-spin" /> : "Sim"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs font-bold text-muted-foreground px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(emp.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-xl hover:bg-destructive/5"
                  title="Excluir funcionário"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}