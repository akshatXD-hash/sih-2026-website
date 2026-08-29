import type {
  ApplicantIntentResult,
  ExtractApplicantIntentRequest,
  HealthResponse,
  OcrCertificateResponse,
  OcrDocumentType,
  RecommendationRequest,
  RecommendationResponse,
  SchemeChatRequest,
  SchemeChatResponse,
  SimplifyTermRequest,
  SimplifyTermResponse,
} from "@/lib/ai-service/contracts";

export interface OcrCertificateRequest {
  file: Blob;
  filename: string;
  docType: OcrDocumentType;
}

export interface AiService {
  health(): Promise<HealthResponse>;
  simplifyTerm(input: SimplifyTermRequest): Promise<SimplifyTermResponse>;
  chat(input: SchemeChatRequest): Promise<SchemeChatResponse>;
  extractApplicantIntent(input: ExtractApplicantIntentRequest): Promise<ApplicantIntentResult>;
  explainRecommendation(input: RecommendationRequest): Promise<RecommendationResponse>;
  ocrCertificate(input: OcrCertificateRequest): Promise<OcrCertificateResponse>;
}
