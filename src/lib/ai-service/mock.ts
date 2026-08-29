import {
  extractApplicantIntentRequestSchema,
  normalizeApplicantIntent,
  ocrDocumentTypeSchema,
  recommendationRequestSchema,
  schemeChatRequestSchema,
  simplifyTermRequestSchema,
} from "@/lib/ai-service/contracts";
import type { AiService, OcrCertificateRequest } from "@/lib/ai-service/types";

function extractAmount(text: string) {
  const match = text.replaceAll(",", "").match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
}

export class MockAiService implements AiService {
  async health() {
    return { status: "mock" };
  }

  async simplifyTerm(input: Parameters<AiService["simplifyTerm"]>[0]) {
    const request = simplifyTermRequestSchema.parse(input);
    return {
      explanation: `${request.term} means the corresponding loan condition in simpler language.`,
    };
  }

  async chat(input: Parameters<AiService["chat"]>[0]) {
    const request = schemeChatRequestSchema.parse(input);
    return {
      response: `Mock answer: I can explain schemes, but eligibility is calculated by the platform. You asked: ${request.message}`,
    };
  }

  async extractApplicantIntent(input: Parameters<AiService["extractApplicantIntent"]>[0]) {
    const request = extractApplicantIntentRequestSchema.parse(input);
    const lower = request.transcript.toLowerCase();
    const projectCategory = lower.includes("manufactur")
      ? "Manufacturing" as const
      : lower.includes("service")
        ? "Service" as const
        : "Trading" as const;
    const gender = lower.includes("female")
      ? "Female"
      : lower.includes("non-binary")
        ? "Non-binary"
        : lower.includes("transgender")
          ? "Transgender"
          : lower.includes("male")
            ? "Male"
            : "Prefer not to say";

    return normalizeApplicantIntent({
      project_category: projectCategory,
      requested_amount: extractAmount(request.transcript),
      annual_income: 0,
      trade: "",
      gender,
      confidence: 0.5,
    });
  }

  async explainRecommendation(input: Parameters<AiService["explainRecommendation"]>[0]) {
    const request = recommendationRequestSchema.parse(input);
    const ranked = [...request.candidate_schemes].sort(
      (a, b) => b.eligibility_score - a.eligibility_score,
    );
    return {
      top_scheme: ranked[0].scheme_name,
      explanation: `${ranked[0].scheme_name} has the strongest deterministic eligibility score among the supplied candidates.`,
      runner_up_note: ranked[1]
        ? `${ranked[1].scheme_name} is the next closest match.`
        : "No runner-up scheme was supplied.",
    };
  }

  async ocrCertificate(input: OcrCertificateRequest) {
    const docType = ocrDocumentTypeSchema.parse(input.docType);
    return {
      doc_type: docType,
      extracted_fields: {
        name: "Mock Applicant",
        category: docType === "caste" ? "Mock category — confirm manually" : null,
        annual_income: docType === "income" ? 240_000 : null,
        valid_until: null,
      },
      income_verified: false,
      raw_confidence: 0.5,
    };
  }
}
