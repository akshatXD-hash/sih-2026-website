import {
  extractApplicantIntentRequestSchema,
  normalizeApplicantIntent,
  ocrDocumentTypeSchema,
  recommendationRequestSchema,
  schemeChatRequestSchema,
  simplifyTermRequestSchema,
} from "@/lib/ai-service/contracts";
import type { AiService, OcrCertificateRequest } from "@/lib/ai-service/types";

function extractAmount(text: string): number {
  const normalized = text.toLowerCase().replaceAll(",", "");
  const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lac|लाख)/i);
  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100_000);
  }

  const thousandMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:thousand|हजार|हज़ार|k)/i);
  if (thousandMatch) {
    return Math.round(Number(thousandMatch[1]) * 1_000);
  }

  const standardMatch = normalized.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  return standardMatch ? Number(standardMatch[1]) : 0;
}

function extractIncome(text: string): number {
  const lower = text.toLowerCase();
  const incomeRegex = /(?:income|आय|salary|कमाई)\s*(?:is|of|होती\s*है|है)?\s*(?:₹|rs\.?|inr)?\s*([0-9.,]+(?:\s*(?:lakhs?|lac|लाख|thousand|हजार|हज़ार))?)/i;
  const match = lower.match(incomeRegex);
  if (match) {
    return extractAmount(match[1]);
  }
  return 0;
}

function detectTrade(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("tailor") || lower.includes("सिलाई") || lower.includes("दर्जी") || lower.includes("शिंपी")) {
    return "tailoring";
  }
  if (lower.includes("carpent") || lower.includes("बढ़ई") || lower.includes("सुतार") || lower.includes("furniture")) {
    return "carpentry";
  }
  if (lower.includes("weav") || lower.includes("बुनकर") || lower.includes("handloom") || lower.includes("हथकरघा")) {
    return "handloom weaving";
  }
  if (lower.includes("potter") || lower.includes("कुम्हार") || lower.includes("मातीकाम")) {
    return "pottery";
  }
  if (lower.includes("welder") || lower.includes("welding") || lower.includes("वेल्डिंग")) {
    return "welding & fabrication";
  }
  if (lower.includes("mechanic") || lower.includes("repair") || lower.includes("मरम्मत") || lower.includes("गैरेज")) {
    return "vehicle repair";
  }
  if (lower.includes("dairy") || lower.includes("डेयरी") || lower.includes("दूध") || lower.includes("पशुपालन")) {
    return "dairy farming";
  }
  if (lower.includes("kirana") || lower.includes("grocery") || lower.includes("किराना") || lower.includes("दुकान") || lower.includes("retail")) {
    return "retail shop";
  }
  return "";
}

function detectCategory(text: string, trade: string): "Manufacturing" | "Service" | "Trading" {
  const lower = text.toLowerCase();
  if (
    lower.includes("manufactur") ||
    lower.includes("कारखाना") ||
    lower.includes("उत्पादन") ||
    lower.includes("workshop") ||
    trade === "carpentry" ||
    trade === "welding & fabrication" ||
    trade === "pottery"
  ) {
    return "Manufacturing";
  }
  if (
    lower.includes("service") ||
    lower.includes("सेवा") ||
    lower.includes("repair") ||
    lower.includes("सिलाई") ||
    trade === "tailoring" ||
    trade === "vehicle repair"
  ) {
    return "Service";
  }
  return "Trading";
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
    const msg = request.message.toLowerCase();

    let response = `### Overview\n\nI can help you understand government and institutional loan schemes.\n\n- **Hard Eligibility**: Calculated deterministically based on verified income, business category, and age.\n- **Pricing & Subsidy**: Concession rates apply for eligible applicants (e.g. female borrowers, SC/ST, artisans).\n- **Query**: "${request.message}"`;
    let suggested_questions = [
      "What documents are required to apply for schemes?",
      "How is scheme eligibility calculated?",
      "What interest concessions are available for women entrepreneurs?",
    ];

    if (msg.includes("moratorium") || msg.includes("repayment")) {
      response = `### Loan Moratorium Explained\n\nA **moratorium period** (or repayment holiday) is a specific duration during which you are not required to make standard EMI payments.\n\n* **Interest Accrual**: Simple interest usually accrues during this time and is added to the principal.\n* **Standard Tenure**: Typically ranges from **3 to 12 months** depending on the scheme and project gestation.`;
      suggested_questions = [
        "Does interest accrue during the moratorium period?",
        "How do I apply for a repayment holiday?",
        "Which schemes offer the longest moratorium tenure?",
      ];
    } else if (msg.includes("mudra") || msg.includes("shishu") || msg.includes("kishore") || msg.includes("tarun")) {
      response = `### Pradhan Mantri MUDRA Yojana (PMMY)\n\nPMMY provides collateral-free institutional credit to non-corporate, non-farm small/micro enterprises across three tiers:\n\n1. **Shishu**: Loans up to ₹50,000 for early-stage micro units.\n2. **Kishore**: Loans from ₹50,000 to ₹5 Lakhs for expanding enterprises.\n3. **Tarun**: Loans from ₹5 Lakhs to ₹10 Lakhs for established enterprises.\n\n* **Collateral**: No collateral required.\n* **Processing Fee**: Zero processing fee for Shishu tier.`;
      suggested_questions = [
        "What is the maximum loan limit under Shishu tier?",
        "What documents do I need for Kishore loans?",
        "Are MUDRA loans eligible for interest subsidies?",
      ];
    } else if (msg.includes("document") || msg.includes("proof")) {
      response = `### Standard Required Documents\n\nTo apply for government-backed schemes, keep the following documentation ready:\n\n* **Identity & Address Proof**: Aadhaar Card, PAN Card, Voter ID.\n* **Business Evidence**: Udyam Registration, Project Report / Business Plan.\n* **Financial Proof**: Last 6 months bank statements, ITR or Income Certificate.\n* **Category Certificates**: Caste certificate or artisan card if claiming special subsidies.`;
      suggested_questions = [
        "Can I submit digital or scanned copies of documents?",
        "What is valid income proof for self-employed applicants?",
        "Is Udyam Registration mandatory for micro loans?",
      ];
    }

    return {
      response,
      suggested_questions,
    };
  }

  async extractApplicantIntent(input: Parameters<AiService["extractApplicantIntent"]>[0]) {
    const request = extractApplicantIntentRequestSchema.parse(input);
    const transcript = request.transcript;
    const lower = transcript.toLowerCase();

    const trade = detectTrade(transcript);
    const projectCategory = detectCategory(transcript, trade);

    const gender = (lower.includes("female") || lower.includes("mahila") || lower.includes("महिला") || lower.includes("woman") || lower.includes("women") || lower.includes("स्त्री"))
      ? "Female"
      : lower.includes("non-binary")
        ? "Non-binary"
        : lower.includes("transgender")
          ? "Transgender"
          : (lower.includes("male") || lower.includes("purush") || lower.includes("पुरुष") || lower.includes("man") || lower.includes("पुरुष"))
            ? "Male"
            : "Prefer not to say";

    const requestedAmount = extractAmount(transcript);
    const annualIncome = extractIncome(transcript);

    return normalizeApplicantIntent({
      project_category: projectCategory,
      requested_amount: requestedAmount,
      annual_income: annualIncome,
      trade: trade || "",
      gender,
      confidence: 0.95,
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
