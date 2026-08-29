"use server";

import { notFound } from "next/navigation";
import { z } from "zod";

import { getAiService, AiServiceError } from "@/lib/ai-service";
import { requireAdmin, requireApplicant } from "@/lib/auth/guards";
import { matchSchemes } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

const supportedLanguageSchema = z.enum(["en", "hi"]).default("en");
const applicationIdSchema = z.string().trim().min(1).max(100);

export interface IntentActionState {
  intent?: {
    projectCategory: "manufacturing" | "services" | "trading";
    requestedAmount: number | null;
    annualIncome: number | null;
    trade: string | null;
    suggestedGender: string | null;
    confidence: number;
    warnings: string[];
  };
  error?: string;
}

export interface SimplifyActionState {
  term?: string;
  explanation?: string;
  error?: string;
}

export interface RecommendationActionState {
  recommendation?: {
    topScheme: string;
    explanation: string;
    runnerUpNote: string;
  };
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatActionState {
  messages: ChatMessage[];
  error?: string;
}

export interface AiHealthActionState {
  checked?: boolean;
  status?: string;
  mode?: "mock" | "remote";
  error?: string;
}

function safeAiError(error: unknown) {
  if (!(error instanceof AiServiceError)) {
    return "The AI service could not complete this request. Please try again.";
  }
  switch (error.code) {
    case "TIMEOUT":
      return "The AI service took too long to respond. Please try again.";
    case "NETWORK":
      return "The AI service is temporarily unreachable. Please try again shortly.";
    case "INVALID_RESPONSE":
      return "The AI service returned an unexpected response. No data was applied.";
    default:
      return "The AI service could not complete this request. Please try again.";
  }
}

export async function extractApplicantIntentAction(
  previousState: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  await requireApplicant();
  const parsed = z.object({
    transcript: z.string().trim().min(10).max(5_000),
    language: supportedLanguageSchema,
  }).safeParse({
    transcript: formData.get("transcript"),
    language: formData.get("language") || "en",
  });
  if (!parsed.success) {
    return { ...previousState, error: "Describe your funding need in at least 10 characters." };
  }

  try {
    const result = await getAiService().extractApplicantIntent(parsed.data);
    return {
      intent: {
        projectCategory: result.project_category,
        requestedAmount: result.requested_amount,
        annualIncome: result.annual_income,
        trade: result.trade,
        suggestedGender: result.suggested_gender,
        confidence: result.confidence,
        warnings: result.warnings,
      },
    };
  } catch (error) {
    return { ...previousState, error: safeAiError(error) };
  }
}

export async function simplifyTermAction(
  _previousState: SimplifyActionState,
  formData: FormData,
): Promise<SimplifyActionState> {
  await requireApplicant();
  const parsed = z.object({
    term: z.string().trim().min(1).max(2_000),
    language: supportedLanguageSchema,
  }).safeParse({
    term: formData.get("term"),
    language: formData.get("language") || "en",
  });
  if (!parsed.success) return { error: "Choose some scheme text to explain." };

  try {
    const result = await getAiService().simplifyTerm(parsed.data);
    return { term: parsed.data.term, explanation: result.explanation };
  } catch (error) {
    return { error: safeAiError(error) };
  }
}

export async function explainRecommendationAction(
  applicationId: string,
  _previousState: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const user = await requireApplicant();
  const parsedId = applicationIdSchema.safeParse(applicationId);
  const parsedLanguage = supportedLanguageSchema.safeParse(formData.get("language") || "en");
  if (!parsedId.success || !parsedLanguage.success) {
    return { error: "This recommendation request is invalid." };
  }

  const [application, schemes] = await Promise.all([
    prisma.application.findFirst({
      where: { id: parsedId.data, userId: user.id },
      select: {
        projectCategory: true,
        requestedAmount: true,
        annualIncome: true,
        trade: true,
        gender: true,
      },
    }),
    prisma.loanScheme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!application) notFound();
  if (!application.projectCategory || application.requestedAmount == null || application.annualIncome == null) {
    return { error: "Complete the eligibility details before requesting an explanation." };
  }

  const matches = matchSchemes({
    projectCategory: application.projectCategory,
    requestedAmount: application.requestedAmount,
    annualIncome: application.annualIncome,
    trade: application.trade,
    gender: application.gender,
  }, schemes).slice(0, 50);
  if (matches.length === 0) {
    return { error: "There are no eligible schemes for the AI to explain." };
  }

  try {
    const result = await getAiService().explainRecommendation({
      applicant: {
        project_category: application.projectCategory,
        requested_amount: Number(application.requestedAmount.toString()),
        annual_income: Number(application.annualIncome.toString()),
        trade: application.trade ?? "Not provided",
        gender: application.gender ?? "PREFER_NOT_TO_SAY",
      },
      candidate_schemes: matches.map((match) => ({
        scheme_name: match.scheme.name,
        max_coverage_pct: match.coveragePercentage,
        interest_rate: Number(
          match.scheme.interestRateMin?.toString()
            ?? match.scheme.interestRateMax?.toString()
            ?? 0,
        ),
        eligibility_score: match.rankScore,
      })),
      language: parsedLanguage.data,
    });
    return {
      recommendation: {
        topScheme: result.top_scheme,
        explanation: result.explanation,
        runnerUpNote: result.runner_up_note,
      },
    };
  } catch (error) {
    return { error: safeAiError(error) };
  }
}

const chatStateSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(10_000),
  })).max(20),
});

export async function schemeChatAction(
  previousState: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  await requireApplicant();
  const previous = chatStateSchema.safeParse(previousState);
  const parsed = z.object({
    message: z.string().trim().min(1).max(2_000),
    language: supportedLanguageSchema,
  }).safeParse({
    message: formData.get("message"),
    language: formData.get("language") || "en",
  });
  const messages = previous.success ? previous.data.messages : [];
  if (!parsed.success) return { messages, error: "Enter a question for the scheme assistant." };

  try {
    const result = await getAiService().chat({
      message: parsed.data.message,
      language: parsed.data.language,
      history: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: message.content,
      })),
    });
    return {
      messages: [
        ...messages,
        { role: "user", content: parsed.data.message },
        { role: "assistant", content: result.response },
      ].slice(-20) as ChatMessage[],
    };
  } catch (error) {
    return { messages, error: safeAiError(error) };
  }
}

export async function checkAiHealthAction(
  _previousState: AiHealthActionState,
  _formData: FormData,
): Promise<AiHealthActionState> {
  void _previousState;
  void _formData;
  await requireAdmin();
  const mode = process.env.AI_SERVICE_MODE === "remote" ? "remote" : "mock";
  try {
    const result = await getAiService().health();
    return { checked: true, status: result.status, mode };
  } catch (error) {
    return { checked: true, mode, error: safeAiError(error) };
  }
}
