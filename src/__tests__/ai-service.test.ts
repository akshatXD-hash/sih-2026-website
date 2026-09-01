import { describe, expect, it, vi } from "vitest";

import { AiServiceError, RemoteAiService } from "@/lib/ai-service/client";
import { normalizeApplicantIntent } from "@/lib/ai-service/contracts";
import { MockAiService } from "@/lib/ai-service/mock";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RemoteAiService", () => {
  it("calls the health endpoint and validates its response", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "healthy" }));
    const service = new RemoteAiService({
      baseUrl: "https://ai.example/",
      fetchImpl: fetchMock as typeof fetch,
    });

    await expect(service.health()).resolves.toEqual({ status: "healthy" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ai.example/health",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("sends the deployed simplify-term request shape with defaults", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return jsonResponse({ explanation: "A repayment holiday." });
    });
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: fetchMock as typeof fetch,
    });

    await expect(service.simplifyTerm({ term: "moratorium" })).resolves.toEqual({
      explanation: "A repayment holiday.",
    });
    expect(capturedInit?.method).toBe("POST");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({ term: "moratorium", language: "en" });
  });

  it("normalizes intent but never auto-applies AI-supplied gender", async () => {
    const rawIntent = {
      project_category: "Service",
      requested_amount: 140000,
      annual_income: 0,
      trade: "Tailoring",
      gender: "Male",
      confidence: 0.88,
    };
    const fetchMock = vi.fn(async () => jsonResponse(rawIntent));
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: fetchMock as typeof fetch,
    });

    const result = await service.extractApplicantIntent({ transcript: "I run a tailoring service" });
    expect(result.project_category).toBe("services");
    expect(result.annual_income).toBeNull();
    expect(result.gender).toBeNull();
    expect(result.suggested_gender).toBe("MALE");
    expect(result.requires_gender_confirmation).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });

  it("uses the documented chat and recommendation explainer paths and receives suggested questions", async () => {
    const paths: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      paths.push(new URL(url).pathname);
      return url.endsWith("/scheme-chat")
        ? jsonResponse({
            response: "Answer",
            suggested_questions: [
              "What is the eligibility for this scheme?",
              "What documents are required?",
            ],
          })
        : jsonResponse({ top_scheme: "Scheme A", explanation: "Best fit", runner_up_note: "Scheme B" });
    });
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: fetchMock as typeof fetch,
    });

    const chatResult = await service.chat({ message: "What is a term loan?" });
    expect(chatResult.response).toBe("Answer");
    expect(chatResult.suggested_questions).toEqual([
      "What is the eligibility for this scheme?",
      "What documents are required?",
    ]);

    await service.explainRecommendation({
      applicant: {
        project_category: "services",
        requested_amount: 100000,
        annual_income: 240000,
        trade: "tailoring",
        gender: "FEMALE",
      },
      candidate_schemes: [{
        scheme_name: "Scheme A",
        max_coverage_pct: 100,
        interest_rate: 7,
        eligibility_score: 95,
      }],
    });

    expect(paths).toEqual(["/scheme-chat", "/recommend-scheme-explainer"]);
  });

  it("handles backward-compatible scheme-chat responses without suggested_questions", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ response: "Legacy answer" }));
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: fetchMock as typeof fetch,
    });

    const result = await service.chat({ message: "Legacy test" });
    expect(result.response).toBe("Legacy answer");
    expect(result.suggested_questions).toEqual([]);
  });

  it("uses multipart data for certificate OCR without setting content-type manually", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return jsonResponse({
        doc_type: "income",
        extracted_fields: {
          name: "Applicant",
          category: null,
          annual_income: 300000,
          valid_until: null,
        },
        income_verified: true,
        raw_confidence: 0.9,
      });
    });
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: fetchMock as typeof fetch,
    });

    await service.ocrCertificate({
      file: new Blob(["certificate"], { type: "application/pdf" }),
      filename: "income.pdf",
      docType: "income",
    });
    expect(capturedInit?.body).toBeInstanceOf(FormData);
    expect(capturedInit?.headers).toBeUndefined();
    expect((capturedInit?.body as FormData).get("doc_type")).toBe("income");
    expect(fetchMock.mock.calls[0][0]).toBe("https://ai.example/ocr-certificate");
  });

  it("rejects a response that drifts from the documented contract", async () => {
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: (async () => jsonResponse({ explanation_text: "wrong key" })) as typeof fetch,
    });

    await expect(service.simplifyTerm({ term: "NPA" })).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    } satisfies Partial<AiServiceError>);
  });

  it("does not expose an upstream error body", async () => {
    const service = new RemoteAiService({
      baseUrl: "https://ai.example",
      fetchImpl: (async () => jsonResponse({ detail: "private upstream detail" }, 500)) as typeof fetch,
    });

    await expect(service.health()).rejects.toMatchObject({ code: "HTTP", status: 500 });
    await expect(service.health()).rejects.not.toThrow("private upstream detail");
  });
});

describe("AI contract normalization", () => {
  it("maps the live category vocabulary to application slugs", () => {
    const result = normalizeApplicantIntent({
      project_category: "Manufacturing",
      requested_amount: 500000,
      annual_income: 250000,
      trade: "Engineering works",
      gender: "Prefer not to say",
      confidence: 1,
    });

    expect(result.project_category).toBe("manufacturing");
    expect(result.suggested_gender).toBe("PREFER_NOT_TO_SAY");
  });

  it("keeps the mock behind the same interface", async () => {
    const service = new MockAiService();
    const result = await service.extractApplicantIntent({
      transcript: "Female manufacturing applicant requests INR 140000",
    });
    expect(result.project_category).toBe("manufacturing");
    expect(result.requested_amount).toBe(140000);
    expect(result.gender).toBeNull();

    const chatResult = await service.chat({ message: "What is MUDRA loan?" });
    expect(chatResult.response).toContain("PMMY");
    expect(chatResult.suggested_questions.length).toBeGreaterThan(0);
  });
});
