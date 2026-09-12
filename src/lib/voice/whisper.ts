export interface TranscribeAudioOptions {
  audio: Buffer | Blob | Uint8Array;
  mimeType?: string;
  language?: string;
  speechModel?: string;
  apiKey?: string;
}

export interface VoiceTranscriptionResult {
  transcript: string;
  language: string;
  confidence: number;
  duration?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
  hindi: "hi",
  english: "en",
  marathi: "mr",
  tamil: "ta",
  telugu: "te",
  bengali: "bn",
  gujarati: "gu",
  kannada: "kn",
  malayalam: "ml",
  punjabi: "pa",
  urdu: "ur",
  hi: "hi",
  en: "en",
  mr: "mr",
  ta: "ta",
  te: "te",
  bn: "bn",
  gu: "gu",
  kn: "kn",
  ml: "ml",
  pa: "pa",
  ur: "ur",
};

function getGroqApiKey(customKey?: string): string | undefined {
  return customKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || undefined;
}

function mockTranscribeAudio(options: TranscribeAudioOptions): VoiceTranscriptionResult {
  const lang = (options.language || "auto").toLowerCase();

  if (lang === "hi" || lang.includes("hindi")) {
    return {
      transcript: "मैं एक महिला दर्जी हूँ, मुझे नई सिलाई मशीन के लिए ₹50,000 का लोन चाहिए।",
      language: "hi",
      confidence: 0.98,
      duration: 3.5,
    };
  }

  if (lang === "mr" || lang.includes("marathi")) {
    return {
      transcript: "मी एक महिला शिंपी आहे, मला नवीन शिलाई मशीनसाठी ₹५०,००० चे कर्ज हवे आहे.",
      language: "mr",
      confidence: 0.96,
      duration: 3.2,
    };
  }

  if (lang === "kn" || lang.includes("kannada")) {
    return {
      transcript: "ನಾನು ಮಹಿಳಾ ಟೈಲರ್, ಹೊಸ ಹೊಲಿಗೆ ಯಂತ್ರ ಖರೀದಿಸಲು ನನಗೆ ₹50,000 ಸಾಲ ಬೇಕಾಗಿದೆ.",
      language: "kn",
      confidence: 0.97,
      duration: 3.6,
    };
  }

  return {
    transcript: "I run a small carpentry workshop and need a loan of 1.5 lakhs to purchase equipment.",
    language: lang === "auto" ? "en" : lang,
    confidence: 0.97,
    duration: 3.8,
  };
}

export async function transcribeAudio(
  options: TranscribeAudioOptions
): Promise<VoiceTranscriptionResult> {
  let audioBuffer: Buffer;
  if (Buffer.isBuffer(options.audio)) {
    audioBuffer = options.audio;
  } else if (options.audio instanceof Blob) {
    const arrayBuffer = await options.audio.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);
  } else {
    audioBuffer = Buffer.from(options.audio);
  }

  if (audioBuffer.length === 0) {
    throw new Error("Recorded audio is empty. Please speak clearly into the microphone.");
  }

  const apiKey = getGroqApiKey(options.apiKey);
  const isMockMode = process.env.AI_SERVICE_MODE === "mock" && !apiKey;

  if (!apiKey || isMockMode) {
    return mockTranscribeAudio(options);
  }

  const mimeType = options.mimeType || "audio/webm";
  const extension = mimeType.includes("wav")
    ? "wav"
    : mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : mimeType.includes("ogg")
        ? "ogg"
        : "webm";

  const requestedLang =
    options.language && options.language !== "auto"
      ? LANGUAGE_CODE_MAP[options.language.toLowerCase()] || options.language
      : undefined;

  const isGroq = !process.env.OPENAI_API_KEY || !!process.env.GROQ_API_KEY;
  const endpoint = isGroq
    ? "https://api.groq.com/openai/v1/audio/transcriptions"
    : "https://api.openai.com/v1/audio/transcriptions";

  const model = options.speechModel || (isGroq ? "whisper-large-v3-turbo" : "whisper-1");

  try {
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer as unknown as BlobPart], { type: mimeType });
    formData.append("file", audioBlob, `audio.${extension}`);
    formData.append("model", model);
    formData.append("response_format", "verbose_json");
    formData.append("temperature", "0");

    if (requestedLang) {
      formData.append("language", requestedLang);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = errorJson.error?.message || errorText;
      } catch {
        // use raw text
      }
      throw new Error(`Whisper API error (${response.status}): ${parsedError}`);
    }

    const data = (await response.json()) as {
      text?: string;
      language?: string;
      duration?: number;
      segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        avg_logprob?: number;
      }>;
    };

    let rawTranscript = data.text?.trim() || "";
    const rawLang = (data.language || requestedLang || "en").toLowerCase();
    const detectedLang = LANGUAGE_CODE_MAP[rawLang] || rawLang || "en";
    const SILENCE_HALLUCINATIONS = [
      "thank you.",
      "thank you",
      "thank you very much.",
      "thank you very much",
      "thanks for watching.",
      "thanks for watching!",
      "thanks for watching",
      "you",
      ".",
      "bye.",
      "bye",
      "subscribe",
    ];

    const normalizedLower = rawTranscript.toLowerCase().replace(/[^\w\s]/g, "").trim();
    if (
      SILENCE_HALLUCINATIONS.some((h) => h.replace(/[^\w\s]/g, "").trim() === normalizedLower)
    ) {
      console.warn(`[Whisper STT] Ignored silence hallucination: "${rawTranscript}"`);
      rawTranscript = "";
    }

    console.log(`[Whisper STT] Lang: ${detectedLang} | Text: "${rawTranscript}"`);

    let confidence = 0.95;
    if (data.segments && data.segments.length > 0) {
      const logProbs = data.segments
        .map((s) => s.avg_logprob)
        .filter((lp): lp is number => typeof lp === "number");
      if (logProbs.length > 0) {
        const avgLogProb = logProbs.reduce((a, b) => a + b, 0) / logProbs.length;
        confidence = Math.min(0.99, Math.max(0.7, Math.exp(avgLogProb)));
      }
    }

    return {
      transcript: rawTranscript,
      language: detectedLang,
      confidence: Number(confidence.toFixed(2)),
      duration: data.duration,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Recorded audio is empty")) {
      throw error;
    }
    throw new Error(
      error instanceof Error
        ? `Groq Whisper Transcription Error: ${error.message}`
        : "Failed to transcribe audio with Groq Whisper"
    );
  }
}
