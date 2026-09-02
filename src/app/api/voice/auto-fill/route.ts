import { NextResponse } from "next/server";

import { getAiService } from "@/lib/ai-service";
import { MockAiService } from "@/lib/ai-service/mock";
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

    const transcription = await transcribeAudio({
      audio: audioBuffer,
      mimeType: audioFile.type || "audio/webm",
      language: language.trim() || "auto",
    });

    if (!transcription.transcript || transcription.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not detect clear speech in the audio. Please try speaking again." },
        { status: 422 }
      );
    }

    let intent;
    try {
      const aiService = getAiService();
      intent = await aiService.extractApplicantIntent({
        transcript: transcription.transcript,
        language: transcription.language,
      });
    } catch (aiErr) {
      console.warn("AI service intent extraction failed, using fallback extractor:", aiErr);
      const fallbackService = new MockAiService();
      intent = await fallbackService.extractApplicantIntent({
        transcript: transcription.transcript,
        language: transcription.language,
      });
    }

    return NextResponse.json({
      transcript: transcription.transcript,
      language: transcription.language,
      confidence: transcription.confidence,
      intent: {
        projectCategory: intent.project_category,
        requestedAmount: intent.requested_amount,
        annualIncome: intent.annual_income,
        trade: intent.trade,
        gender: intent.gender,
        suggestedGender: intent.suggested_gender,
        requiresGenderConfirmation: intent.requires_gender_confirmation,
        confidence: intent.confidence,
        warnings: intent.warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process voice auto-fill request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
