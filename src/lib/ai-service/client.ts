import type { z } from "zod";

import {
  extractApplicantIntentRequestSchema,
  healthResponseSchema,
  normalizeApplicantIntent,
  ocrCertificateResponseSchema,
  ocrDocumentTypeSchema,
  rawApplicantIntentSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
  schemeChatRequestSchema,
  schemeChatResponseSchema,
  simplifyTermRequestSchema,
  simplifyTermResponseSchema,
} from "@/lib/ai-service/contracts";
import type { AiService, OcrCertificateRequest } from "@/lib/ai-service/types";

export type AiServiceErrorCode = "INVALID_REQUEST" | "NETWORK" | "TIMEOUT" | "HTTP" | "INVALID_RESPONSE";

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AiServiceErrorCode,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export interface RemoteAiServiceOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class RemoteAiService implements AiService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RemoteAiServiceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    if (!/^https?:\/\//.test(this.baseUrl)) {
      throw new AiServiceError("AI service URL must use HTTP or HTTPS", "INVALID_REQUEST");
    }
  }

  private async request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
        headers: init?.body instanceof FormData
          ? init.headers
          : { "content-type": "application/json", ...init?.headers },
      });
      if (!response.ok) {
        throw new AiServiceError(`AI service request failed with status ${response.status}`, "HTTP", response.status);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AiServiceError("AI service returned invalid JSON", "INVALID_RESPONSE");
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new AiServiceError("AI service response did not match the expected contract", "INVALID_RESPONSE");
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      if (controller.signal.aborted) {
        throw new AiServiceError("AI service request timed out", "TIMEOUT");
      }
      throw new AiServiceError("AI service could not be reached", "NETWORK");
    } finally {
      clearTimeout(timeout);
    }
  }

  async health() {
    return this.request("/health", healthResponseSchema);
  }

  async simplifyTerm(input: Parameters<AiService["simplifyTerm"]>[0]) {
    const request = simplifyTermRequestSchema.parse(input);
    return this.request("/simplify-term", simplifyTermResponseSchema, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async chat(input: Parameters<AiService["chat"]>[0]) {
    const request = schemeChatRequestSchema.parse(input);
    return this.request("/scheme-chat", schemeChatResponseSchema, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async extractApplicantIntent(input: Parameters<AiService["extractApplicantIntent"]>[0]) {
    const request = extractApplicantIntentRequestSchema.parse(input);
    const raw = await this.request("/extract-applicant-intent", rawApplicantIntentSchema, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return normalizeApplicantIntent(raw);
  }

  async explainRecommendation(input: Parameters<AiService["explainRecommendation"]>[0]) {
    const request = recommendationRequestSchema.parse(input);
    return this.request("/recommend-scheme-explainer", recommendationResponseSchema, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async ocrCertificate(input: OcrCertificateRequest) {
    const docType = ocrDocumentTypeSchema.parse(input.docType);
    if (!(input.file instanceof Blob) || input.file.size === 0) {
      throw new AiServiceError("A non-empty certificate file is required", "INVALID_REQUEST");
    }
    const formData = new FormData();
    formData.set("file", input.file, input.filename);
    formData.set("doc_type", docType);
    return this.request("/ocr-certificate", ocrCertificateResponseSchema, {
      method: "POST",
      body: formData,
    });
  }
}
