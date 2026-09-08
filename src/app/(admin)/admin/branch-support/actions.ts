"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { supportInputSchema, SUPPORT_VALID_DAYS } from "@/lib/scheme-support";

export async function saveBranchSupport(_previous: { error?: string; saved?: boolean }, data: FormData): Promise<{ error?: string; saved?: boolean }> {
  const reviewer = await requireAdmin();
  if (reviewer.role !== "ADMIN" && reviewer.role !== "REVIEWER") redirect("/unauthorized");
  const parsed = supportInputSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the verification details" };
  const value = parsed.data;
  const scheme = await prisma.loanScheme.findFirst({ where: { id: value.schemeId, isActive: true }, select: { id: true } });
  if (!scheme) return { error: "Select an active scheme" };
  const [branch] = value.branchType === "BANK"
    ? await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM bank_directory WHERE id = ${value.branchId}`
    : await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM channel_partners WHERE id = ${value.branchId} AND is_active = true AND is_verified = true`;
  if (!branch) return { error: "Branch not found or unavailable" };
  const verifiedAt = new Date(value.verifiedDate);
  const expiresAt = new Date(verifiedAt.getTime() + SUPPORT_VALID_DAYS * 86400000);
  // Append a review: prior evidence remains available in the audit history.
  await prisma.$executeRaw`
    INSERT INTO branch_scheme_support (scheme_id, bank_id, partner_id, status, evidence_url, notes, verified_at, expires_at, reviewer_id)
    VALUES (${scheme.id}, ${value.branchType === "BANK" ? branch.id : null}, ${value.branchType === "PARTNER" ? branch.id : null},
      ${value.status}, ${value.evidenceUrl}, ${value.notes}, ${verifiedAt}, ${expiresAt}, ${reviewer.id})
  `;
  revalidatePath("/branches");
  revalidatePath("/admin/branch-support");
  return { saved: true };
}
