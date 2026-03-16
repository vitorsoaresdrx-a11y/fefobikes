import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client"; // ajuste o path se necessário

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export default function FaceEnrollment() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | capturing | saving | success | error
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", department: "" });

  // Carrega os modelos do face-api.js
  useEffect(() => {
    const loadModels = async () => {
      setStatus("loading");
      setMessage("Carregando modelos de reconhecimento...");
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        setModelsLoaded(true);
        setStatus("idle");
        setMessage("");
      } catch (err) {
        setStatus("error");
        setMessage("Erro ao carregar modelos. Verifique sua conexão.");
      }
    };
    loadModels();
  }, []);

  // Inicia a câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStatus("capturing");
      setMessage("Posicione o rosto no centro e clique em Capturar.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível acessar a câmera.");
    }
  };

  // Para a câmera
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // Captura e salva o descriptor facial
  const capture = async () => {
    if (!form.name || !form.email) {
      setMessage("Preencha nome e e-mail antes de capturar.");
      return;
    }

    setStatus("saving");
    setMessage("Detectando rosto...");

    try {
      console.log("[FaceEnrollment] modelsLoaded:", modelsLoaded);
      console.log("[FaceEnrollment] videoRef.current:", !!videoRef.current);
      console.log("[FaceEnrollment] video readyState:", videoRef.current?.readyState);

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      console.log("[FaceEnrollment] detection:", detection);

      if (!detection) {
        setStatus("capturing");
        setMessage("Rosto não detectado. Tente novamente com boa iluminação.");
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      // 1. Cria o funcionário
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert({ name: form.name, email: form.email, department: form.department })
        .select()
        .single();

      if (empError) throw empError;

      // 2. Salva o descriptor facial
      const { error: faceError } = await supabase
        .from("face_embeddings")
        .insert({ employee_id: employee.id, descriptor });

      if (faceError) throw faceError;

      stopCamera();
      setStatus("success");
      setMessage(`Funcionário ${form.name} cadastrado com sucesso!`);
      setForm({ name: "", email: "", department: "" });
    } catch (err) {
      console.error("[FaceEnrollment] capture error:", err);
      setStatus("error");
      setMessage("Erro ao capturar/salvar: " + (err?.message || "tente novamente."));
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">Cadastro Facial</h2>

      <div className="space-y-2">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Nome completo *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="E-mail *"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Departamento (opcional)"
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
        />
      </div>

      <div className="relative bg-black rounded overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="absolute inset-0" />
        {status !== "capturing" && status !== "saving" && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm opacity-60">
            Câmera desligada
          </div>
        )}
      </div>

      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-500" : status === "success" ? "text-green-600" : "text-gray-500"}`}>
          {message}
        </p>
      )}

      <div className="flex gap-2">
        {status !== "capturing" && status !== "saving" ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded || status === "loading"}
            className="flex-1 bg-blue-600 text-white rounded py-2 disabled:opacity-50"
          >
            {status === "loading" ? "Carregando..." : "Abrir Câmera"}
          </button>
        ) : (
          <>
            <button
              onClick={capture}
              disabled={status === "saving"}
              className="flex-1 bg-green-600 text-white rounded py-2 disabled:opacity-50"
            >
              {status === "saving" ? "Salvando..." : "Capturar e Cadastrar"}
            </button>
            <button
              onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
              className="px-4 border rounded py-2"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
