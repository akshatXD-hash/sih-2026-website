import {
  extractApplicantIntentRequestSchema,
  normalizeApplicantIntent,
  ocrDocumentTypeSchema,
  recommendationRequestSchema,
  schemeChatRequestSchema,
  simplifyTermRequestSchema,
} from "@/lib/ai-service/contracts";
import type { AiService, OcrCertificateRequest } from "@/lib/ai-service/types";

function parseNumericAmount(text: string): number {
  const normalized = text.toLowerCase().replaceAll(",", "");
  const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lac|लाख|ಲಕ್ಷ)/i);
  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100_000);
  }
  const thousandMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:thousand|हजार|हज़ार|ಸಾವಿರ|k)/i);
  if (thousandMatch) {
    return Math.round(Number(thousandMatch[1]) * 1_000);
  }
  const standardMatch = normalized.match(/(?:₹|rs\.?|inr|ರೂ)?\s*(\d+(?:\.\d+)?)/i);
  return standardMatch ? Number(standardMatch[1]) : 0;
}
function extractAmount(text: string): number {
  const lower = text.toLowerCase();

  const postfixLoanRegex = /([0-9.,]+(?:\s*(?:lakhs?|lac|लाख|ಲಕ್ಷ|thousand|हजार|हज़ार|ಸಾವಿರ))?)\s*(?:₹|rs\.?|inr|ರೂ|रुपये)?\s*(?:का|के लिए|ಗಾಗಿ)?\s*(?:loan|कर्ज|लोन|ऋण|ಸಾಲ|ಬೇಕು|funding)/i;
  const postfixMatch = lower.match(postfixLoanRegex);
  if (postfixMatch && postfixMatch[1]) {
    const val = parseNumericAmount(postfixMatch[1]);
    if (val > 0) return val;
  }

  const prefixLoanRegex = /(?:loan(?:\s*of)?|need|require|चाहिए|कर्ज|लोन|ऋण|ಸಾಲ|ಬೇಕು|ಅಗತ್ಯವಿದೆ|funding(?:\s*of)?)\s*(?:of|is|around)?\s*(?:₹|rs\.?|inr|ರೂ)?\s*([0-9.,]+(?:\s*(?:lakhs?|lac|लाख|ಲಕ್ಷ|thousand|हजार|हज़ार|ಸಾವಿರ))?)/i;
  const prefixMatch = lower.match(prefixLoanRegex);
  if (prefixMatch && prefixMatch[1]) {
    const val = parseNumericAmount(prefixMatch[1]);
    if (val > 0) return val;
  }

  const sanitized = lower.replace(/(?:income|आय|salary|कमाई|ಆದಾಯ|ಸಂಬಳ)[^.!?]*/gi, "");
  return parseNumericAmount(sanitized || text);
}
function extractIncome(text: string): number {
  const lower = text.toLowerCase();
  const incomeRegex = /(?:income|आय|salary|कमाई|ಆದಾಯ|ಸಂಬಳ)\s*(?:is|of|होती\s*है|है|ಆಗಿದೆ|ಇದೆ)?\s*(?:₹|rs\.?|inr|ರೂ)?\s*([0-9.,]+(?:\s*(?:lakhs?|lac|लाख|ಲಕ್ಷ|thousand|हजार|हज़ार|ಸಾವಿರ))?)/i;
  const match = lower.match(incomeRegex);
  if (match && match[1]) {
    return parseNumericAmount(match[1]);
  }
  return 0;
}

function detectTrade(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("tailor") || lower.includes("सिलाई") || lower.includes("दर्जी") || lower.includes("शिंपी") || lower.includes("ಟೈಲರ್") || lower.includes("ಹೊಲಿಗೆ")) {
    return "tailoring";
  }
  if (lower.includes("carpent") || lower.includes("बढ़ई") || lower.includes("सुतार") || lower.includes("furniture") || lower.includes("ಬಡಗಿ") || lower.includes("ಮರದ")) {
    return "carpentry";
  }
  if (lower.includes("weav") || lower.includes("बुनकर") || lower.includes("handloom") || lower.includes("हथकरघा") || lower.includes("ನೇಯ್ಗೆ") || lower.includes("ಮಗ್ಗ")) {
    return "handloom weaving";
  }
  if (lower.includes("potter") || lower.includes("कुम्हार") || lower.includes("मातीकाम") || lower.includes("ಕುಂಬಾರ") || lower.includes("ಮಡಕೆ")) {
    return "pottery";
  }
  if (lower.includes("welder") || lower.includes("welding") || lower.includes("वेल्डिंग") || lower.includes("ವೆಲ್ಡಿಂಗ್")) {
    return "welding & fabrication";
  }
  if (lower.includes("mechanic") || lower.includes("repair") || lower.includes("मरम्मत") || lower.includes("गैरेज") || lower.includes("ರಿಪೇರಿ") || lower.includes("ಮೆಕ್ಯಾನಿಕ್")) {
    return "vehicle repair";
  }
  if (lower.includes("dairy") || lower.includes("डेयरी") || lower.includes("दूध") || lower.includes("पशुपालन") || lower.includes("ಡೈರಿ") || lower.includes("ಹಾಲು") || lower.includes("ಹೈನುಗಾರಿಕೆ")) {
    return "dairy farming";
  }
  if (lower.includes("kirana") || lower.includes("grocery") || lower.includes("किराना") || lower.includes("दुकान") || lower.includes("retail") || lower.includes("ಕಿರಾಣಿ") || lower.includes("ಅಂಗಡಿ")) {
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
    lower.includes("ಉತ್ಪಾದನೆ") ||
    lower.includes("ಕಾರಖಾನೆ") ||
    lower.includes("ವರ್ಕ್‌ಶಾಪ್") ||
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
    lower.includes("ಸೇವೆ") ||
    lower.includes("ಹೊಲಿಗೆ") ||
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
    if (request.language === "kn" || request.language.includes("kannada")) {
      return {
        explanation: `${request.term} ಎಂದರೆ ಸಾಲದ ನಿಯಮ ಮತ್ತು ಷರತ್ತುಗಳನ್ನು ಸರಳ ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಲಾಗಿದೆ.`,
      };
    }
    if (request.language === "hi" || request.language.includes("hindi")) {
      return {
        explanation: `${request.term} का अर्थ ऋण की संबंधित शर्त को सरल भाषा में समझाना है।`,
      };
    }
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

    const gender = (lower.includes("female") || lower.includes("mahila") || lower.includes("महिला") || lower.includes("woman") || lower.includes("women") || lower.includes("स्त्री") || lower.includes("ಮಹಿಳ") || lower.includes("ಹೆಣ್ಣು") || lower.includes("ಸ್ತ್ರೀ"))
      ? "Female"
      : lower.includes("non-binary")
        ? "Non-binary"
        : lower.includes("transgender")
          ? "Transgender"
          : (lower.includes("male") || lower.includes("purush") || lower.includes("पुरुष") || lower.includes("man") || lower.includes("ಪುರುಷ") || lower.includes("ಗಂಡು"))
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
    const top = ranked[0];
    const runnerUp = ranked[1];

    if (request.language === "kn" || request.language.includes("kannada")) {
      return {
        top_scheme: top?.scheme_name || "Scheme",
        explanation: `${top?.scheme_name || "ಈ ಯೋಜನೆ"} ನಿಮ್ಮ ಅರ್ಹತೆಯ ಪ್ರಕಾರ ಅತ್ಯುನ್ನತ ಹೊಂದಾಣಿಕೆಯನ್ನು ಹೊಂದಿದೆ.`,
        runner_up_note: runnerUp
          ? `${runnerUp.scheme_name} ಮುಂದಿನ ಹೊಂದಾಣಿಕೆಯಾಗಿದೆ.`
          : "ಯಾವುದೇ ಪರ್ಯಾಯ ಯೋಜನೆ ಲಭ್ಯವಿಲ್ಲ.",
      };
    }

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
