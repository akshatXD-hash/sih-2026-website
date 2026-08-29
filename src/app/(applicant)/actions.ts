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

const branchSearchSchema = z
  .object({
    applicationId: z.string().trim().min(1).max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().int().min(1).max(500).default(50),
    district: z.string().trim().min(2).max(80).optional(),
  })
  .superRefine((value, context) => {
    const hasLat = value.lat != null;
    const hasLng = value.lng != null;
    if (hasLat !== hasLng) {
      context.addIssue({ code: "custom", message: "Provide both latitude and longitude" });
    }
    if (!hasLat && !value.district) {
      context.addIssue({ code: "custom", message: "Provide coordinates or a district" });
    }
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
  const parsed = branchSearchSchema.safeParse({
    applicationId: formData.get("applicationId") || undefined,
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    radius: formData.get("radius") || undefined,
    district: formData.get("district") || undefined,
  });
  if (!parsed.success) throw new Error("Enter valid coordinates or a district");
  const { applicationId, lat, lng, radius, district } = parsed.data;

  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  params.set("radius", String(radius));
  if (district) params.set("district", district);
  if (applicationId) params.set("applicationId", applicationId);
  redirect(`/branches?${params.toString()}`);
}

export async function selectBranchAction(
  applicationId: string,
  branchId: string,
) {
  const user = await requireApplicant();
  const parsedBranchId = z.string().trim().min(1).max(100).safeParse(branchId);
  if (!parsedBranchId.success) notFound();
  const [branch] = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM channel_partners
    WHERE id = ${parsedBranchId.data}
      AND is_active = true
      AND is_verified = true
      AND location IS NOT NULL
    LIMIT 1
  `;
  if (!branch) notFound();

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    data: { channelPartnerId: branch.id },
  });
  if (result.count !== 1) notFound();

  redirect(`/applications/new?applicationId=${encodeURIComponent(applicationId)}`);
}

export async function submitApplicationAction(applicationId: string) {
  const user = await requireApplicant();
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    select: { id: true, loanSchemeId: true, channelPartnerId: true },
  });
  if (!application) notFound();
  if (!application.loanSchemeId) throw new Error("Choose a scheme before submitting");
  if (!application.channelPartnerId) throw new Error("Choose a branch before submitting");

  await prisma.application.update({
    where: { id: application.id },
    data: { status: ApplicationStatus.SUBMITTED, submittedAt: new Date() },
  });
  redirect(`/applications/new?applicationId=${encodeURIComponent(application.id)}&submitted=1`);
}
