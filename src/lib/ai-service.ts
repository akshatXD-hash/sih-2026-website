import "server-only";

import { z } from "zod";

import { RemoteAiService } from "@/lib/ai-service/client";
import { MockAiService } from "@/lib/ai-service/mock";
import type { AiService } from "@/lib/ai-service/types";

const configurationSchema = z.object({
  AI_SERVICE_MODE: z.enum(["mock", "remote"]).default("mock"),
  AI_SERVICE_URL: z.string().url().optional(),
  AIML_SERVICE_URL: z.string().url().optional(),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
});

export function createAiService(environment: NodeJS.ProcessEnv = process.env): AiService {
  const configuration = configurationSchema.parse(environment);
  if (configuration.AI_SERVICE_MODE === "mock") return new MockAiService();
  const url = configuration.AI_SERVICE_URL || configuration.AIML_SERVICE_URL;
  if (!url) {
    throw new Error("AI_SERVICE_URL or AIML_SERVICE_URL is required when AI_SERVICE_MODE is remote");
  }
  return new RemoteAiService({
    baseUrl: url,
    timeoutMs: configuration.AI_SERVICE_TIMEOUT_MS,
  });
}

let service: AiService | undefined;

export function getAiService() {
  service ??= createAiService();
  return service;
}

export type { AiService, OcrCertificateRequest } from "@/lib/ai-service/types";
export * from "@/lib/ai-service/contracts";
export { AiServiceError } from "@/lib/ai-service/client";
