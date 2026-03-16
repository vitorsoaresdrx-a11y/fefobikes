import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client"; // ajuste o path se necessário

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const SIMILARITY_THRESHOLD = 0.5; // distância máxima para considerar match (menor = mais rigoroso)

export default function ClockIn() {
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [labeledDescriptors, setLabeledDescriptors] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | recognizing | success | error
  const [message, setMessage] = useState("");
  const [lastRecord, setLastRecord] = useState(null);

  // Carrega modelos e descritores do banco
  useEffect(() => {
    const init = async () => {
      setStatus("loading");
      setMessage("Carregando sistema...");

      try {
        // Carrega modelos
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);

        // Carrega todos os funcionários e seus descritores
        const { data, error } = await supabase
          .from("face_embeddings")
          .select("employee_id, descriptor, employees(name)");

        if (error) throw error;
        if (!data || data.length === 0) {
          setStatus("error");
          setMessage("Nenhum funcionário cadastrado ainda.");
          return;
        }

        // Monta os LabeledFaceDescriptors para o matcher
        const labeled = data.map((row) => {
          const descriptor = new Float32Array(row.descriptor);
          return new faceapi.LabeledFaceDescriptors(
            JSON.stringify({ id: row.employee_id, name: row.employees.name }),
            [descriptor]
          );
        });

        setLabeledDescriptors(labeled);
        setModelsLoaded(true);
        setStatus("idle");
        setMessage("");
      } catch (err) {
        setStatus("error");
        setMessage("Erro ao inicializar: " + (err.message || "tente novamente."));
      }
    };

    init();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStatus("ready");
      setMessage("Posicione o rosto e clique em Reconhecer.");
      setLastRecord(null);
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

  const recognize = async () => {
    setStatus("recognizing");
    setMessage("Reconhecendo...");

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatus("ready");
      setMessage("Rosto não detectado. Verifique a iluminação e tente novamente.");
      return;
    }

    const matcher = new faceapi.FaceMatcher(labeledDescriptors, SIMILARITY_THRESHOLD);
    const match = matcher.findBestMatch(detection.descriptor);

    if (match.label === "unknown") {
      setStatus("ready");
      setMessage("Funcionário não reconhecido. Tente novamente ou verifique o cadastro.");
      return;
    }

    // Extrai id e nome do label
    const { id: employeeId, name } = JSON.parse(match.label);
    const confidence = parseFloat((1 - match.distance).toFixed(3));

    // Determina se é entrada ou saída
    // Busca o último registro do dia para decidir o tipo
    const today = new Date().toISOString().split("T")[0];
    const { data: lastEntry } = await supabase
      .from("time_records")
      .select("type")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    const type =
      !lastEntry || lastEntry.type === "clock_out" ? "clock_in" : "clock_out";

    // Salva o registro
    const { error } = await supabase.from("time_records").insert({
      employee_id: employeeId,
      type,
      confidence,
    });

    if (error) {
      setStatus("ready");
      setMessage("Erro ao registrar ponto: " + error.message);
      return;
    }

    const typeLabel = type === "clock_in" ? "Entrada" : "Saída";
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    stopCamera();
    setStatus("success");
    setLastRecord({ name, type: typeLabel, time, confidence });
    setMessage("");
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">Registro de Ponto</h2>

      <div className="relative bg-black rounded overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {status !== "ready" && status !== "recognizing" && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm opacity-60">
            Câmera desligada
          </div>
        )}
      </div>

      {/* Resultado do reconhecimento */}
      {lastRecord && status === "success" && (
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-1">
          <p className="font-semibold text-green-800 text-lg">{lastRecord.name}</p>
          <p className="text-green-700">
            {lastRecord.type} registrada às {lastRecord.time}
          </p>
          <p className="text-green-500 text-xs">
            Confiança: {(lastRecord.confidence * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-500" : "text-gray-500"}`}>
          {message}
        </p>
      )}

      <div className="flex gap-2">
        {status !== "ready" && status !== "recognizing" ? (
          <button
            onClick={() => { startCamera(); setStatus("ready"); }}
            disabled={!modelsLoaded || status === "loading"}
            className="flex-1 bg-blue-600 text-white rounded py-2 disabled:opacity-50"
          >
            {status === "loading" ? "Carregando..." : "Abrir Câmera"}
          </button>
        ) : (
          <>
            <button
              onClick={recognize}
              disabled={status === "recognizing"}
              className="flex-1 bg-green-600 text-white rounded py-2 disabled:opacity-50"
            >
              {status === "recognizing" ? "Reconhecendo..." : "Registrar Ponto"}
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
