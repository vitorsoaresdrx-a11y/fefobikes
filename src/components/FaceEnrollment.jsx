import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import {
  UserPlus,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  Mail,
  Building2,
  User,
  ShieldCheck,
} from "lucide-react";
import EmployeeList from "./EmployeeList";

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export default function FaceEnrollment() {
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [loadProgress, setLoadProgress] = useState("");
  const [form, setForm] = useState({ name: "", email: "", department: "" });
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const loadModels = async () => {
      setStatus("loading");
      try {
        setLoadProgress("Carregando detector de rosto...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando pontos faciais...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando reconhecimento...");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
        setModelsLoaded(true);
        setStatus("idle");
        setLoadProgress("");
        setMessage("");
      } catch {
        setStatus("error");
        setMessage("Erro ao carregar modelos. Verifique sua conexão.");
        setLoadProgress("");
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      videoRef.current.srcObject = stream;
      setStatus("capturing");
      setMessage("Posicione o rosto no centro e clique em Capturar.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capture = async () => {
    if (!form.name || !form.email) {
      setMessage("Preencha nome e e-mail antes de capturar.");
      return;
    }

    setStatus("saving");
    setMessage("Detectando rosto...");

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus("capturing");
        setMessage("Rosto não detectado. Tente novamente com boa iluminação.");
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      // Upsert employee
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .upsert(
          { name: form.name, email: form.email, department: form.department, active: true },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (empError) throw empError;

      // Delete old face embedding if exists, then insert new one
      await supabase.from("face_embeddings").delete().eq("employee_id", employee.id);

      const { error: faceError } = await supabase
        .from("face_embeddings")
        .insert({ employee_id: employee.id, descriptor });

      if (faceError) throw faceError;

      stopCamera();
      setStatus("success");
      setMessage(`Funcionário ${form.name} cadastrado com sucesso!`);
      setForm({ name: "", email: "", department: "" });
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      setStatus("error");
      setMessage("Erro ao capturar/salvar: " + (err?.message || "tente novamente."));
    }
  };

  const handleReRegister = useCallback((empData) => {
    setForm({ name: empData.name, email: empData.email, department: empData.department });
    setStatus("idle");
    setMessage("Preencha os dados e abra a câmera para recadastrar o rosto.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isCameraActive = status === "capturing" || status === "saving";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-card border border-border flex items-center justify-center overflow-hidden shadow-2xl relative group">
              <UserPlus size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none mb-1">
                Cadastro Facial
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Registro de novo funcionário
              </p>
            </div>
          </div>
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

        {/* Success message */}
        {status === "success" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[32px] p-8 space-y-2 flex items-start gap-4">
            <CheckCircle2 size={28} className="text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <p className="font-black text-emerald-400 text-xl">Cadastro Concluído</p>
              <p className="text-emerald-300 font-bold text-sm">{message}</p>
            </div>
          </div>
        )}

        {/* Form + Camera Card */}
        <div className="relative group">
          <div className="absolute inset-0 transition-all duration-1000 blur-[80px] opacity-20 -z-10 bg-primary" />

          <div className="bg-card border border-border rounded-[40px] p-8 md:p-12 shadow-2xl overflow-hidden relative space-y-8">
            <div className="absolute -right-10 -top-10 opacity-[0.02] text-foreground">
              <UserPlus size={300} />
            </div>

            <div className="relative z-10 space-y-8">
              {/* Form fields */}
              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
                    <User size={12} /> Nome Completo *
                  </label>
                  <input
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all text-sm font-bold"
                    placeholder="Ex: João da Silva"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
                    <Mail size={12} /> E-mail *
                  </label>
                  <input
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all text-sm font-bold"
                    placeholder="joao@exemplo.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
                    <Building2 size={12} /> Departamento
                  </label>
                  <input
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all text-sm font-bold"
                    placeholder="Opcional"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>
              </div>

              {/* Camera */}
              <div className="relative bg-black rounded-[24px] overflow-hidden aspect-video max-w-md mx-auto border border-border">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isCameraActive && status === "saving" && (
                  <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                    <span className="bg-primary/80 text-primary-foreground text-xs px-4 py-2 rounded-full animate-pulse flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Detectando rosto...
                    </span>
                  </div>
                )}
                {isCameraActive && status === "capturing" && (
                  <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                    <span className="bg-emerald-500/80 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2">
                      <ShieldCheck size={14} /> Câmera pronta
                    </span>
                  </div>
                )}
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Camera size={32} className="opacity-30" />
                    <span className="text-xs font-bold opacity-50">Câmera desligada</span>
                  </div>
                )}
                {isCameraActive && (
                  <button
                    onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
                    className="absolute top-4 right-4 bg-card/80 backdrop-blur p-2 rounded-full border border-border hover:bg-destructive/20 transition-colors"
                  >
                    <X size={18} className="text-foreground" />
                  </button>
                )}
              </div>

              {/* Message */}
              {message && status !== "success" && (
                <p className={`text-sm text-center font-bold ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {message}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 max-w-md mx-auto">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    disabled={!modelsLoaded || status === "loading"}
                    className="flex-1 inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-[28px] h-20 px-10 text-lg font-black uppercase tracking-tighter shadow-[0_10px_30px_hsl(var(--primary)/0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 size={22} className="animate-spin" /> Carregando...
                      </>
                    ) : (
                      <>
                        <Camera size={22} /> Abrir Câmera
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={capture}
                      disabled={status === "saving"}
                      className="flex-1 inline-flex items-center justify-center gap-3 bg-emerald-600 text-white rounded-[28px] h-16 px-8 text-sm font-black uppercase tracking-tighter shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50"
                    >
                      {status === "saving" ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} /> Capturar e Cadastrar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
                      className="px-6 border border-border rounded-2xl h-16 text-foreground font-bold text-sm hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-card border border-border rounded-[40px] p-8 md:p-12 shadow-2xl">
          <EmployeeList refreshKey={listRefreshKey} onReRegister={handleReRegister} />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-border flex flex-col items-center gap-3 opacity-30 grayscale pointer-events-none">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-foreground" />
          <span className="text-[9px] font-black uppercase tracking-widest">Cadastro Seguro via Reconhecimento Facial</span>
        </div>
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Fefo Bikes Security System // 2026</p>
      </footer>
    </div>
  );
}