import "server-only";

import { AssemblyAI } from "assemblyai";

export interface TranscribeAudioOptions {
  audio: Buffer | Blob | Uint8Array;
  mimeType?: string;
  language?: string;
  speechModel?: "best" | "nano";
  apiKey?: string;
}

export interface VoiceTranscriptionResult {
  transcript: string;
  language: string;
  confidence: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

function getAssemblyAiApiKey(customKey?: string): string | undefined {
  return customKey || process.env.ASSEMBLYAI_API_KEY || undefined;
}

function mockTranscribeAudio(options: TranscribeAudioOptions): VoiceTranscriptionResult {
  const lang = (options.language || "auto").toLowerCase();

  if (lang === "hi" || lang.includes("hindi")) {
    return {
      transcript: "मैं एक महिला दर्जी हूँ, मुझे नई सिलाई मशीन के लिए ₹50,000 का लोन चाहिए।",
      language: "hi",
      confidence: 0.96,
    };
  }

  if (lang === "mr" || lang.includes("marathi")) {
    return {
      transcript: "मी एक महिला शिंपी आहे, मला नवीन शिलाई मशीनसाठी ₹५०,००० चे कर्ज हवे आहे.",
      language: "mr",
      confidence: 0.94,
    };
  }

  return {
    transcript: "I run a small carpentry workshop and need a loan of 1.5 lakhs to purchase equipment.",
    language: lang === "auto" ? "en" : lang,
    confidence: 0.95,
  };
}

export async function transcribeAudio(
  options: TranscribeAudioOptions
): Promise<VoiceTranscriptionResult> {
  const apiKey = getAssemblyAiApiKey(options.apiKey);
  const isMockMode = process.env.AI_SERVICE_MODE === "mock" && !apiKey;

  if (!apiKey || isMockMode) {
    return mockTranscribeAudio(options);
  }

  const client = new AssemblyAI({
    apiKey,
  });

  try {
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

    const requestedLang = options.language && options.language !== "auto"
      ? options.language
      : undefined;

    const transcriptParams: Parameters<typeof client.transcripts.transcribe>[0] = {
      audio: audioBuffer,
      speech_model: options.speechModel ?? "best",
      ...(requestedLang
        ? { language_code: requestedLang as any }
        : { language_detection: true }),
    };

    const transcript = await client.transcripts.transcribe(transcriptParams);

    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI speech recognition failed");
    }

    const detectedLang = transcript.language_code || (options.language !== "auto" ? options.language : "en") || "en";
    const confidence = typeof transcript.confidence === "number" ? transcript.confidence : 0.92;

    return {
      transcript: transcript.text?.trim() || "",
      language: detectedLang,
      confidence,
      words: transcript.words?.map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Recorded audio is empty")) {
      throw error;
    }
    throw new Error(
      error instanceof Error
        ? `AssemblyAI Transcription Error: ${error.message}`
        : "Failed to transcribe audio with AssemblyAI"
    );
  }
}
