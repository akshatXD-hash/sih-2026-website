import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApplicant } from "@/lib/auth/guards";
import { transcribeAudio } from "@/lib/voice/whisper";

export async function POST(request: Request) {
  try {
    await requireApplicant();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const language = formData.get("language")?.toString() || "auto";

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required in 'audio' field." },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: "Audio recording is empty. Please speak clearly into your microphone." },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const result = await transcribeAudio({
      audio: audioBuffer,
      mimeType: audioFile.type || "audio/webm",
      language: language.trim() || "auto",
    });

    if (!result.transcript || result.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not detect clear speech in the audio. Please try speaking again." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process audio recording.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
