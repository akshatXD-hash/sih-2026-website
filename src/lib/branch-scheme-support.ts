import "server-only";
import { prisma } from "@/lib/prisma";
import { effectiveSupport, type SchemeSupport } from "@/lib/scheme-support";

export async function getBranchSchemeSupport(schemeId: string, bankIds: string[], partnerIds: string[]): Promise<Map<string, SchemeSupport>> {
  if (!bankIds.length && !partnerIds.length) return new Map();
  const rows = await prisma.$queryRaw<Array<{
    bank_id: string | null; partner_id: string | null; status: string;
    evidence_url: string; notes: string; verified_at: Date; expires_at: Date;
  }>>`
    SELECT DISTINCT ON (bank_id, partner_id) bank_id, partner_id, status, evidence_url, notes, verified_at, expires_at
    FROM branch_scheme_support
    WHERE scheme_id = ${schemeId}
      AND (bank_id = ANY(${bankIds}::text[]) OR partner_id = ANY(${partnerIds}::text[]))
    ORDER BY bank_id, partner_id, id DESC
  `;
  return new Map(rows.map(row => [row.bank_id ? `BANK:${row.bank_id}` : `PARTNER:${row.partner_id}`, effectiveSupport(row)]));
}

export async function partnerSupportsScheme(partnerId: string, schemeId: string) {
  const supports = await getBranchSchemeSupport(schemeId, [], [partnerId]);
  return supports.get(`PARTNER:${partnerId}`)?.status === "SUPPORTED";
}
