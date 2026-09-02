import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiService } from "@/lib/ai-service";
import { requireApplicant } from "@/lib/auth/guards";

const intentBodySchema = z.object({
  transcript: z.string().trim().min(3).max(10_000),
  language: z.string().trim().min(2).max(20).default("auto"),
});

export async function POST(request: Request) {
  try {
    await requireApplicant();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = intentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide a valid transcript with at least 3 characters." },
        { status: 400 }
      );
    }

    const aiService = getAiService();
    const result = await aiService.extractApplicantIntent({
      transcript: parsed.data.transcript,
      language: parsed.data.language,
    });

    return NextResponse.json({
      projectCategory: result.project_category,
      requestedAmount: result.requested_amount,
      annualIncome: result.annual_income,
      trade: result.trade,
      gender: result.gender,
      suggestedGender: result.suggested_gender,
      requiresGenderConfirmation: result.requires_gender_confirmation,
      confidence: result.confidence,
      warnings: result.warnings,
      raw: result.raw,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract applicant intent from transcript.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
