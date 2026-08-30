import { z } from "zod";

export const languageSchema = z.string().trim().min(2).max(20).default("en");

export const simplifyTermRequestSchema = z.object({
  term: z.string().trim().min(1).max(2_000),
  language: languageSchema,
});
export const simplifyTermResponseSchema = z.object({ explanation: z.string() });

export const chatHistoryItemSchema = z.object({
  role: z.string().trim().min(1).max(40),
  parts: z.string().max(10_000),
});
export const schemeChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(10_000),
  history: z.array(chatHistoryItemSchema).max(50).default([]),
  language: z.string().trim().min(2).max(20).default("auto"),
});
export const schemeChatResponseSchema = z.object({
  response: z.string(),
  follow_up_questions: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
});

export const extractApplicantIntentRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(50_000),
  language: languageSchema,
});
export const rawApplicantIntentSchema = z.object({
  project_category: z.enum(["Manufacturing", "Service", "Trading"]),
  requested_amount: z.number().nonnegative(),
  annual_income: z.number().nonnegative(),
  trade: z.string(),
  gender: z.string(),
  confidence: z.number().min(0).max(1),
});

export const recommendationApplicantSchema = z.object({
  project_category: z.string(),
  requested_amount: z.number().nonnegative(),
  annual_income: z.number().nonnegative(),
  trade: z.string(),
  gender: z.string(),
});
export const recommendationCandidateSchema = z.object({
  scheme_name: z.string(),
  max_coverage_pct: z.number(),
  interest_rate: z.number(),
  eligibility_score: z.number(),
});
export const recommendationRequestSchema = z.object({
  applicant: recommendationApplicantSchema,
  candidate_schemes: z.array(recommendationCandidateSchema).min(1).max(50),
  language: languageSchema,
});
export const recommendationResponseSchema = z.object({
  top_scheme: z.string(),
  explanation: z.string(),
  runner_up_note: z.string(),
});

export const ocrDocumentTypeSchema = z.enum(["caste", "income"]);
export const ocrCertificateResponseSchema = z.object({
  doc_type: z.string(),
  extracted_fields: z.object({
    name: z.string(),
    category: z.string().nullable(),
    annual_income: z.number().nullable(),
    valid_until: z.string().nullable(),
  }),
  income_verified: z.boolean(),
  raw_confidence: z.number().min(0).max(1),
});

export const healthResponseSchema = z.object({ status: z.string() });

export type SimplifyTermRequest = z.input<typeof simplifyTermRequestSchema>;
export type SimplifyTermResponse = z.infer<typeof simplifyTermResponseSchema>;
export type SchemeChatRequest = z.input<typeof schemeChatRequestSchema>;
export type SchemeChatResponse = z.infer<typeof schemeChatResponseSchema>;
export type ExtractApplicantIntentRequest = z.input<typeof extractApplicantIntentRequestSchema>;
export type RawApplicantIntent = z.infer<typeof rawApplicantIntentSchema>;
export type RecommendationRequest = z.input<typeof recommendationRequestSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type OcrDocumentType = z.infer<typeof ocrDocumentTypeSchema>;
export type OcrCertificateResponse = z.infer<typeof ocrCertificateResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export type ConfirmedGender =
  | "FEMALE"
  | "MALE"
  | "TRANSGENDER"
  | "NON_BINARY"
  | "OTHER"
  | "PREFER_NOT_TO_SAY";

export interface ApplicantIntentResult {
  project_category: "manufacturing" | "services" | "trading";
  requested_amount: number | null;
  annual_income: number | null;
  trade: string | null;
  gender: null;
  suggested_gender: ConfirmedGender | null;
  requires_gender_confirmation: true;
  confidence: number;
  warnings: string[];
  raw: RawApplicantIntent;
}

const GENDER_ALIASES: Record<string, ConfirmedGender> = {
  FEMALE: "FEMALE",
  MALE: "MALE",
  TRANSGENDER: "TRANSGENDER",
  NON_BINARY: "NON_BINARY",
  NONBINARY: "NON_BINARY",
  OTHER: "OTHER",
  PREFER_NOT_TO_SAY: "PREFER_NOT_TO_SAY",
};

export function normalizeApplicantIntent(raw: RawApplicantIntent): ApplicantIntentResult {
  const warnings = [
    "AI-supplied gender must be confirmed by the applicant before it is stored.",
  ];
  if (raw.requested_amount === 0) {
    warnings.push("Requested amount was zero; the service uses zero when no amount is detected.");
  }
  if (raw.annual_income === 0) {
    warnings.push("Annual income was zero; confirm whether the value was missing or genuinely zero.");
  }

  const genderKey = raw.gender.trim().toUpperCase().replaceAll(/[^A-Z]+/g, "_").replaceAll(/^_|_$/g, "");
  return {
    project_category:
      raw.project_category === "Manufacturing"
        ? "manufacturing"
        : raw.project_category === "Service"
          ? "services"
          : "trading",
    requested_amount: raw.requested_amount > 0 ? raw.requested_amount : null,
    annual_income: raw.annual_income > 0 ? raw.annual_income : null,
    trade: raw.trade.trim() || null,
    gender: null,
    suggested_gender: GENDER_ALIASES[genderKey] ?? null,
    requires_gender_confirmation: true,
    confidence: raw.confidence,
    warnings,
    raw,
  };
}
