import { z } from "zod";

export const SUPPORT_VALID_DAYS = 90;
export interface SchemeSupport {
  status: "SUPPORTED" | "NOT_SUPPORTED" | "UNKNOWN" | "EXPIRED";
  evidenceUrl?: string;
  notes?: string;
  verifiedAt?: string;
  expiresAt?: string;
}

export function effectiveSupport(record: {
  status: string; evidence_url: string; notes: string;
  verified_at: Date; expires_at: Date;
} | undefined, now = new Date()): SchemeSupport {
  if (!record) return { status: "UNKNOWN" };
  const fresh = record.verified_at <= now && record.expires_at > now;
  return {
    status: fresh && ["SUPPORTED", "NOT_SUPPORTED", "UNKNOWN"].includes(record.status)
      ? record.status as SchemeSupport["status"] : "EXPIRED",
    evidenceUrl: record.evidence_url, notes: record.notes,
    verifiedAt: record.verified_at.toISOString(), expiresAt: record.expires_at.toISOString(),
  };
}

export const supportLabels: Record<SchemeSupport["status"], string> = {
  SUPPORTED: "Scheme support confirmed",
  NOT_SUPPORTED: "Does not handle this scheme",
  UNKNOWN: "Scheme support unconfirmed",
  EXPIRED: "Confirmation expired: recheck with branch",
};

export const supportInputSchema = z.object({
  branchId: z.string().trim().min(1).max(100),
  branchType: z.enum(["BANK", "PARTNER"]),
  schemeId: z.string().trim().min(1).max(100),
  status: z.enum(["SUPPORTED", "NOT_SUPPORTED", "UNKNOWN"]),
  evidenceUrl: z.url().max(1000).refine(value => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use an HTTPS evidence link without credentials"),
  notes: z.string().trim().min(15).max(1000),
  verifiedDate: z.iso.date(),
}).superRefine((value, context) => {
  const time = new Date(value.verifiedDate).getTime();
  const today = new Date().toISOString().slice(0, 10);
  if (value.verifiedDate > today || time <= Date.now() - SUPPORT_VALID_DAYS * 86400000) {
    context.addIssue({ code: "custom", path: ["verifiedDate"], message: "Use a verification date within the last 90 days, not in the future" });
  }
});
