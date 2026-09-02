"use client";

import { useEffect, useRef, useState } from "react";

export interface ExtractedVoiceIntent {
  transcript: string;
  language: string;
  confidence: number;
  projectCategory: "manufacturing" | "services" | "trading" | null;
  trade: string | null;
  requestedAmount: number | null;
  annualIncome: number | null;
  suggestedGender: string | null;
  requiresGenderConfirmation: boolean;
  warnings: string[];
}

interface VoiceAutoFillProps {
  onApply: (intent: ExtractedVoiceIntent) => void;
  disabled?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: "auto", label: "Auto Detect", native: "स्वचालित पहचान" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "en", label: "English", native: "English" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
] as const;

type RecordingState = "idle" | "recording" | "processing" | "review";

export function VoiceAutoFill({ onApply, disabled = false }: VoiceAutoFillProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 60, 45, 25, 15]);
  const [error, setError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [confidence, setConfidence] = useState<number>(0.95);
  const [extractedIntent, setExtractedIntent] = useState<ExtractedVoiceIntent | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  function cleanupAudio() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  }

  async function startRecording() {
    setError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported by your browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioCtx();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVisualizer = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const levels = [
              Math.max(12, (dataArray[1] || 0) / 2.5),
              Math.max(16, (dataArray[3] || 0) / 2.2),
              Math.max(22, (dataArray[5] || 0) / 2.0),
              Math.max(30, (dataArray[7] || 0) / 1.8),
              Math.max(22, (dataArray[9] || 0) / 2.0),
              Math.max(16, (dataArray[11] || 0) / 2.2),
              Math.max(12, (dataArray[13] || 0) / 2.5),
            ];
            setAudioLevels(levels);
          }
          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
        };
        updateVisualizer();
      } catch {
      }
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/wav",
      ].find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) || "";

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        if (audioBlob.size > 0) {
          await processRecordedAudio(audioBlob);
        } else {
          setState("idle");
          setError("No audio was recorded. Please try again.");
        }
      };

      mediaRecorder.start(250);
      setState("recording");

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 45) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      cleanupAudio();
      setState("idle");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone permission was denied. Please allow microphone access in your browser settings.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No microphone found on your device. Please connect a microphone.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to access microphone.");
      }
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => { });
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("processing");
    }
  }

  function cancelRecording() {
    cleanupAudio();
    audioChunksRef.current = [];
    setState("idle");
    setError(null);
  }

  async function processRecordedAudio(audioBlob: Blob) {
    setState("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.set("audio", audioBlob, "recording.webm");
      formData.set("language", selectedLanguage);

      const response = await fetch("/api/voice/auto-fill", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process voice recording.");
      }

      const rawIntent = data.intent || {};
      const intentResult: ExtractedVoiceIntent = {
        transcript: data.transcript || "",
        language: data.language || selectedLanguage,
        confidence: data.confidence || 0.95,
        projectCategory: rawIntent.projectCategory || null,
        trade: rawIntent.trade || null,
        requestedAmount: rawIntent.requestedAmount || null,
        annualIncome: rawIntent.annualIncome || null,
        suggestedGender: rawIntent.suggestedGender || null,
        requiresGenderConfirmation: rawIntent.requiresGenderConfirmation ?? true,
        warnings: rawIntent.warnings || [],
      };

      setTranscript(data.transcript || "");
      setDetectedLanguage(data.language || selectedLanguage);
      setConfidence(data.confidence || 0.95);
      setExtractedIntent(intentResult);
      setState("review");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Failed to transcribe audio.");
    }
  }

  async function reExtractIntentWithModifiedTranscript(newTranscript: string) {
    if (!newTranscript.trim()) return;
    try {
      const res = await fetch("/api/voice/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: newTranscript,
          language: detectedLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setExtractedIntent({
          transcript: newTranscript,
          language: detectedLanguage,
          confidence,
          projectCategory: data.projectCategory || null,
          trade: data.trade || null,
          requestedAmount: data.requestedAmount || null,
          annualIncome: data.annualIncome || null,
          suggestedGender: data.suggestedGender || null,
          requiresGenderConfirmation: data.requiresGenderConfirmation ?? true,
          warnings: data.warnings || [],
        });
      }
    } catch {
    }
  }

  function handleApply() {
    if (extractedIntent) {
      onApply({
        ...extractedIntent,
        transcript,
      });
      setState("idle");
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-purple-50/50 p-5 shadow-sm transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Voice-to-Form Auto-Fill</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse" />
                AssemblyAI Multilingual
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Speak in Hindi, English, Marathi or your regional language to automatically fill this form.
            </p>
          </div>
        </div>
        {state === "idle" && (
          <div className="flex items-center gap-2">
            <label htmlFor="voice-language-select" className="text-xs font-semibold text-slate-600">
              Language:
            </label>
            <select
              id="voice-language-select"
              className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={disabled || state !== "idle"}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label} ({lang.native})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}
      {state === "idle" && (
        <div className="mt-4 flex flex-col items-center justify-center gap-4 py-2 sm:flex-row sm:justify-between">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-semibold text-slate-700">
              Try saying:
            </p>
            <p className="text-xs italic text-slate-500">
              &ldquo;मैं एक महिला दर्जी हूँ, मुझे सिलाई मशीन के लिए ₹50,000 का लोन चाहिए&rdquo; or &ldquo;I run a small carpentry workshop and need a loan of 1.5 lakhs&rdquo;
            </p>
          </div>

          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="group relative inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition-all duration-200 hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-violet-300 disabled:opacity-50"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-300 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
            </span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Speak to Auto-Fill Form
          </button>
        </div>
      )}
      {state === "recording" && (
        <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50/40 p-5 text-center">
          <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            Listening... Speak now ({formatTime(recordingSeconds)})
          </div>
          <div className="flex h-12 items-center justify-center gap-1.5">
            {audioLevels.map((lvl, index) => (
              <span
                key={index}
                className="w-1.5 rounded-full bg-gradient-to-t from-red-500 to-rose-400 transition-all duration-75"
                style={{ height: `${Math.min(48, Math.max(8, lvl))}px` }}
              />
            ))}
          </div>
          <p className="max-w-md text-xs text-slate-600">
            Speak your trade, requirement, loan amount, or family income in your preferred language.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-red-200 hover:bg-red-700"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Click to Finish Speaking
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {state === "processing" && (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-6 text-center">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute h-10 w-10 animate-spin rounded-full border-3 border-violet-200 border-t-violet-700" />
            <svg className="h-5 w-5 text-violet-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-violet-950">Transcribing Speech with AssemblyAI...</p>
            <p className="mt-0.5 text-xs text-violet-700">
              Detecting language and extracting structured applicant parameters with AI/ML microservice...
            </p>
          </div>
        </div>
      )}
      {state === "review" && extractedIntent && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-violet-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Captured Voice Transcript
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 uppercase">
                  🌐 {detectedLanguage}
                </span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  ✓ {Math.round(confidence * 100)}% Accuracy
                </span>
              </div>
            </div>

            <textarea
              className="mt-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-400"
              rows={2}
              value={transcript}
              onChange={(e) => {
                const updated = e.target.value;
                setTranscript(updated);
                reExtractIntentWithModifiedTranscript(updated);
              }}
              aria-label="Editable voice transcript"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              💡 You can edit any transcribed words above if needed. Parameters will update automatically.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Category</span>
              <p className="mt-1 text-xs font-bold capitalize text-slate-900">
                {extractedIntent.projectCategory || "Not specified"}
              </p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Trade / Occupation</span>
              <p className="mt-1 text-xs font-bold capitalize text-slate-900">
                {extractedIntent.trade || "Not specified"}
              </p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Requested Loan</span>
              <p className="mt-1 text-xs font-bold text-slate-900">
                {extractedIntent.requestedAmount ? `₹${extractedIntent.requestedAmount.toLocaleString("en-IN")}` : "Not specified"}
              </p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Gender</span>
              <p className="mt-1 text-xs font-bold text-slate-900">
                {extractedIntent.suggestedGender || "Not specified"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50"
              >
                🔄 Speak Again
              </button>
              <button
                type="button"
                onClick={() => {
                  setState("idle");
                  setExtractedIntent(null);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Discard
              </button>
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700"
            >
              Apply to Eligibility Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}