import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Timer,
  Play,
  LogOut,
  Coffee,
  History,
  User,
  Activity,
  CalendarDays,
  ShieldCheck,
  Camera,
  X,
  Loader2,
  UtensilsCrossed,
  Check,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import * as faceapi from "face-api.js";

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const SIMILARITY_THRESHOLD = 0.5;
const AUTO_DETECT_INTERVAL = 1200;

// --- UI Components ---

const PontoButton = ({ children, variant = "primary", size = "md", className = "", ...props }: any) => {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_30px_rgba(41,82,255,0.3)]",
    secondary: "bg-card text-foreground hover:bg-card/80 border border-border",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)]",
  };
  const sizes: Record<string, string> = {
    sm: "h-10 px-4 text-[10px] font-black uppercase tracking-widest",
    md: "h-14 px-8 text-sm font-bold",
    lg: "h-20 px-10 rounded-[28px] text-lg font-black uppercase tracking-tighter",
  };
  return (
    <button className={`inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const StatusBadge = ({ active }: { active: boolean }) => (
  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
    <span className="text-[10px] font-black uppercase tracking-widest">{active ? 'Jornada Ativa' : 'Fora de Expediente'}</span>
  </div>
);

const TYPE_LABELS: Record<string, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_out: "Saída Intervalo",
  break_in: "Retorno Intervalo",
};

interface RecognizedPerson {
  id: string;
  name: string;
  confidence: number;
}

// --- Main Component ---

export default function PontoRegistro() {
  const [time, setTime] = useState(new Date());

  // Face recognition
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoDetectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const labeledRef = useRef<faceapi.LabeledFaceDescriptors[] | null>(null);
  const recognizedMapRef = useRef<Map<string, RecognizedPerson>>(new Map());
  const pendingStreamRef = useRef<MediaStream | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  // Action mode: what happens when user clicks "Pronto"
  const [actionMode, setActionMode] = useState<"clock_in" | "clock_out" | "break_out" | "break_in" | null>(null);

  // Recognized people (displayed in UI while camera is open)
  const [recognizedList, setRecognizedList] = useState<RecognizedPerson[]>([]);

  // General state
  const [logs, setLogs] = useState<Array<{ type: string; time: string; date: string; name: string }>>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [todayHours, setTodayHours] = useState("00h 00m");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<{ count: number; type: string } | null>(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load models + descriptors
  useEffect(() => {
    const init = async () => {
      try {
        setLoadProgress("Carregando detector de rosto...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando pontos faciais...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando reconhecimento...");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);

        setLoadProgress("Carregando funcionários...");
        const { data, error } = await supabase
          .from("face_embeddings")
          .select("employee_id, descriptor, employees(name)");

        if (error) throw error;
        if (!data || data.length === 0) {
          setMessage("Nenhum funcionário cadastrado ainda.");
          setLoadProgress("");
          return;
        }

        const labeled = data.map((row: any) => {
          const descriptor = new Float32Array(row.descriptor);
          return new faceapi.LabeledFaceDescriptors(
            JSON.stringify({ id: row.employee_id, name: row.employees.name }),
            [descriptor]
          );
        });

        labeledRef.current = labeled;
        setModelsLoaded(true);
        setLoadProgress("");
      } catch (err: any) {
        setMessage("Erro ao inicializar: " + (err.message || "tente novamente."));
        setLoadProgress("");
      }
    };
    init();
    return () => {
      if (autoDetectRef.current) clearInterval(autoDetectRef.current);
    };
  }, []);

  // Load today's records
  const loadTodayRecords = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("time_records")
      .select("type, timestamp, confidence, employee_id, employees(name)")
      .eq("date", today)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      setLogs(data.map((r: any) => ({
        type: TYPE_LABELS[r.type] || r.type,
        time: new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        date: "Hoje",
        name: r.employees?.name || "—",
      })));

      // Check if any employee is currently working
      // Group by employee, check last record
      const byEmployee = new Map<string, string>();
      for (const r of data) {
        if (!byEmployee.has(r.employee_id)) {
          byEmployee.set(r.employee_id, r.type);
        }
      }
      const anyWorking = [...byEmployee.values()].some(t => t === "clock_in" || t === "break_in");
      setIsWorking(anyWorking);

      calculateHours(data);
    } else {
      setLogs([]);
      setIsWorking(false);
      setTodayHours("00h 00m");
    }
  }, []);

  useEffect(() => {
    loadTodayRecords();
  }, [loadTodayRecords]);

  const calculateHours = (records: any[]) => {
    // Group by employee, calculate per-employee, sum total
    const byEmployee = new Map<string, any[]>();
    for (const r of records) {
      if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, []);
      byEmployee.get(r.employee_id)!.push(r);
    }

    let totalMs = 0;
    for (const empRecords of byEmployee.values()) {
      const sorted = [...empRecords].reverse();
      let lastIn: Date | null = null;
      for (const r of sorted) {
        if (r.type === "clock_in" || r.type === "break_in") {
          lastIn = new Date(r.timestamp);
        } else if ((r.type === "clock_out" || r.type === "break_out") && lastIn) {
          totalMs += new Date(r.timestamp).getTime() - lastIn.getTime();
          lastIn = null;
        }
      }
      if (lastIn) totalMs += Date.now() - lastIn.getTime();
    }

    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    setTodayHours(`${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`);
  };

  // Camera controls
  const stopCamera = useCallback(() => {
    if (autoDetectRef.current) {
      clearInterval(autoDetectRef.current);
      autoDetectRef.current = null;
    }

    const attachedStream = videoRef.current?.srcObject as MediaStream | null;
    attachedStream?.getTracks().forEach((t) => t.stop());

    if (pendingStreamRef.current && pendingStreamRef.current !== attachedStream) {
      pendingStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    pendingStreamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  // Continuous multi-face detection
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !labeledRef.current) return;

    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) return;

      const matcher = new faceapi.FaceMatcher(labeledRef.current, SIMILARITY_THRESHOLD);

      for (const detection of detections) {
        const match = matcher.findBestMatch(detection.descriptor);
        if (match.label === "unknown") continue;

        const { id, name } = JSON.parse(match.label);
        const confidence = parseFloat((1 - match.distance).toFixed(3));

        // Only update if better confidence or new person
        const existing = recognizedMapRef.current.get(id);
        if (!existing || confidence > existing.confidence) {
          recognizedMapRef.current.set(id, { id, name, confidence });
          setRecognizedList([...recognizedMapRef.current.values()]);
        }
      }
    } catch {
      // Silently ignore detection errors during continuous scanning
    }
  }, []);

  const startCamera = async (mode: "clock_in" | "clock_out" | "break_out" | "break_in") => {
    setActionMode(mode);
    setLastBatchResult(null);
    setMessage("");
    recognizedMapRef.current.clear();
    setRecognizedList([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOpen(true);

      // Start continuous detection
      if (autoDetectRef.current) clearInterval(autoDetectRef.current);
      autoDetectRef.current = setInterval(detectFaces, AUTO_DETECT_INTERVAL);
    } catch {
      setMessage("Não foi possível acessar a câmera.");
    }
  };

  // "Pronto" button — register all recognized people
  const handleConfirm = async () => {
    if (!actionMode || recognizedMapRef.current.size === 0) {
      setMessage("Nenhum rosto reconhecido ainda. Posicione os funcionários na câmera.");
      return;
    }

    setSaving(true);
    stopCamera();

    const people = [...recognizedMapRef.current.values()];
    let successCount = 0;

    for (const person of people) {
      const { error } = await supabase.from("time_records").insert({
        employee_id: person.id,
        type: actionMode,
        confidence: person.confidence,
      });
      if (!error) successCount++;
    }

    const typeLabel = TYPE_LABELS[actionMode] || actionMode;
    setLastBatchResult({ count: successCount, type: typeLabel });
    setActionMode(null);
    recognizedMapRef.current.clear();
    setRecognizedList([]);
    setSaving(false);
    await loadTodayRecords();
  };

  const handleCancel = () => {
    stopCamera();
    setActionMode(null);
    recognizedMapRef.current.clear();
    setRecognizedList([]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-card border border-border flex items-center justify-center overflow-hidden shadow-2xl relative group">
              <Users size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none mb-1">
                Registro de Ponto
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Reconhecimento Facial
              </p>
            </div>
          </div>
          <StatusBadge active={isWorking} />
        </header>

        {/* Loading progress */}
        {loadProgress && (
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">{loadProgress}</p>
          </div>
        )}

        {/* Camera + Recognition Panel */}
        {cameraOpen && (
          <div className="space-y-6">
            <div className="relative bg-black rounded-[32px] overflow-hidden aspect-video border border-border">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                <span className="bg-primary/80 text-primary-foreground text-xs px-4 py-2 rounded-full animate-pulse flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Detectando rostos... {recognizedList.length > 0 && `(${recognizedList.length} encontrados)`}
                </span>
              </div>
              <div className="absolute top-4 left-4">
                <span className="bg-card/80 backdrop-blur text-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-border">
                  {TYPE_LABELS[actionMode || ""] || actionMode}
                </span>
              </div>
            </div>

            {/* Recognized people list */}
            {recognizedList.length > 0 && (
              <div className="bg-card border border-border rounded-[24px] p-4 space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] px-2">
                  Funcionários Detectados ({recognizedList.length})
                </p>
                <div className="space-y-1">
                  {recognizedList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <User size={16} className="text-emerald-400" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400">
                        {(p.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Camera action buttons */}
            <div className="flex gap-3">
              <PontoButton
                variant="success"
                size="lg"
                className="flex-1"
                onClick={handleConfirm}
                disabled={recognizedList.length === 0 || saving}
              >
                <span className="flex items-center gap-3">
                  {saving ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
                  {saving ? "Registrando..." : `Pronto (${recognizedList.length})`}
                </span>
              </PontoButton>
              <PontoButton variant="secondary" size="md" onClick={handleCancel}>
                <X size={18} />
              </PontoButton>
            </div>
          </div>
        )}

        {/* Batch result */}
        {lastBatchResult && !cameraOpen && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[32px] p-8 space-y-2">
            <p className="font-black text-emerald-400 text-xl">
              {lastBatchResult.type} Registrada
            </p>
            <p className="text-emerald-300 font-bold">
              {lastBatchResult.count} funcionário{lastBatchResult.count !== 1 ? "s" : ""} registrado{lastBatchResult.count !== 1 ? "s" : ""} às{" "}
              {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        {/* Message */}
        {message && !cameraOpen && (
          <p className="text-sm text-muted-foreground text-center">{message}</p>
        )}

        {/* Cockpit Central */}
        {!cameraOpen && (
          <div className="relative group">
            <div className={`absolute inset-0 transition-all duration-1000 blur-[80px] opacity-20 -z-10 ${isWorking ? 'bg-emerald-500' : 'bg-primary'}`} />

            <div className="bg-card border border-border rounded-[40px] p-10 md:p-16 shadow-2xl overflow-hidden relative">
              <div className="absolute -right-10 -top-10 opacity-[0.02] text-foreground">
                <Clock size={300} />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Horário Local Atualizado</p>
                  <h2 className="text-7xl md:text-8xl font-black text-foreground tracking-tighter tabular-nums leading-none">
                    {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <span className="text-xl md:text-2xl text-primary ml-2 opacity-50">
                      {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                    </span>
                  </h2>
                  <p className="text-sm font-bold text-muted-foreground capitalize flex items-center justify-center gap-2">
                    <CalendarDays size={16} className="text-primary" />
                    {format(time, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex flex-col w-full max-w-sm gap-4">
                  {/* Main action: Bater Ponto or Encerrar Turno */}
                  <PontoButton
                    variant="primary"
                    size="lg"
                    onClick={() => startCamera(isWorking ? "clock_out" : "clock_in")}
                    disabled={!modelsLoaded || !!loadProgress}
                    className={isWorking ? "bg-foreground text-background hover:bg-foreground/90" : ""}
                  >
                    {!modelsLoaded && loadProgress ? (
                      <span className="flex items-center gap-3">
                        <Loader2 size={22} className="animate-spin" /> Carregando...
                      </span>
                    ) : isWorking ? (
                      <span className="flex items-center gap-3">
                        <LogOut size={22} /> Encerrar Turno
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Play size={22} fill="currentColor" /> Bater Ponto
                      </span>
                    )}
                  </PontoButton>

                  {/* Intervalo */}
                  <PontoButton
                    variant="secondary"
                    className="rounded-2xl gap-2 text-xs"
                    onClick={() => startCamera(isWorking ? "break_out" : "break_in")}
                    disabled={!modelsLoaded || !!loadProgress}
                  >
                    <Coffee size={16} className="text-amber-500" /> Intervalo
                  </PontoButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats + History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Today's Metrics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Timer size={16} className="text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Métricas de Hoje</h3>
            </div>
            <div className="bg-card border border-border rounded-[32px] p-8 grid grid-cols-1 gap-8">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Trabalhado</p>
                <p className="text-2xl font-black text-foreground tracking-tighter">{todayHours}</p>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Batidas Recentes</h3>
              </div>
            </div>
            <div className="bg-card border border-border rounded-[32px] p-2 space-y-1">
              {logs.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-6">Nenhum registro hoje</p>
              )}
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-2xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      log.type.includes('Entrada') || log.type.includes('Retorno')
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {log.type.includes('Intervalo') ? <UtensilsCrossed size={18} /> :
                       log.type.includes('Entrada') || log.type.includes('Retorno') ? <Activity size={18} /> : <LogOut size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{log.type}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{log.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-foreground tabular-nums">{log.time}</p>
                    <div className="flex items-center gap-1 justify-end text-muted-foreground">
                      <ShieldCheck size={10} />
                      <span className="text-[8px] font-bold uppercase">Verificado</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-border flex flex-col items-center gap-3 opacity-30 grayscale pointer-events-none">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-foreground" />
          <span className="text-[9px] font-black uppercase tracking-widest">Registro via Reconhecimento Facial</span>
        </div>
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Fefo Bikes Security System // 2026</p>
      </footer>
    </div>
  );
}
