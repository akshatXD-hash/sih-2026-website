"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { ApplicationStatus, Gender } from "@/generated/prisma/enums";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  projectCategory: z.string().trim().min(2).max(80),
  trade: z.string().trim().max(80).optional(),
  gender: z.enum(Gender),
});

const financeSchema = z.object({
  requestedAmount: z.coerce.number().positive().max(50_000_000),
  annualIncome: z.coerce.number().nonnegative().max(100_000_000),
});

export async function startEligibilityAction(formData: FormData) {
  const user = await requireApplicant();
  const parsed = profileSchema.safeParse({
    projectCategory: formData.get("projectCategory"),
    trade: formData.get("trade") || undefined,
    gender: formData.get("gender"),
  });
  if (!parsed.success) throw new Error("Invalid eligibility profile");

  const application = await prisma.application.create({
    data: {
      userId: user.id,
      projectCategory: parsed.data.projectCategory,
      trade: parsed.data.trade,
      gender: parsed.data.gender,
    },
    select: { id: true },
  });

  redirect(`/eligibility/${application.id}/finance`);
}

export async function completeEligibilityAction(
  applicationId: string,
  formData: FormData,
) {
  const user = await requireApplicant();
  const parsed = financeSchema.safeParse({
    requestedAmount: formData.get("requestedAmount"),
    annualIncome: formData.get("annualIncome"),
  });
  if (!parsed.success) throw new Error("Invalid financial details");

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    data: parsed.data,
  });
  if (result.count !== 1) notFound();

  redirect(`/schemes?applicationId=${encodeURIComponent(applicationId)}`);
}

export async function selectSchemeAction(
  applicationId: string,
  schemeId: string,
) {
  const user = await requireApplicant();
  const scheme = await prisma.loanScheme.findFirst({
    where: { id: schemeId, isActive: true },
    select: { id: true },
  });
  if (!scheme) notFound();

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    data: { loanSchemeId: scheme.id },
  });
  if (result.count !== 1) notFound();

  redirect(`/branches?applicationId=${encodeURIComponent(applicationId)}`);
}

export async function searchBranchesAction(formData: FormData) {
  await requireApplicant();
  const district = z.string().trim().min(2).max(80).parse(formData.get("district"));
  const applicationId = z.string().trim().optional().parse(formData.get("applicationId") || undefined);
  const params = new URLSearchParams({ district });
  if (applicationId) params.set("applicationId", applicationId);
  redirect(`/branches?${params.toString()}`);
}

export async function submitApplicationAction(applicationId: string) {
  const user = await requireApplicant();
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    select: { id: true, loanSchemeId: true },
  });
  if (!application) notFound();
  if (!application.loanSchemeId) throw new Error("Choose a scheme before submitting");

  await prisma.application.update({
    where: { id: application.id },
    data: { status: ApplicationStatus.SUBMITTED, submittedAt: new Date() },
  });
  redirect(`/applications/new?applicationId=${encodeURIComponent(application.id)}&submitted=1`);
}
