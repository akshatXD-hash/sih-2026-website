"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ApplicationStatus, Gender } from "@/generated/prisma/enums";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { matchSchemes } from "@/lib/matching";
import { getBranchSchemeSupport, partnerSupportsScheme } from "@/lib/branch-scheme-support";
import { isAtmListing, schemeLender } from "@/lib/scheme-lender";

const applicantTagSchema = z.enum([
  "SC", "ST", "OBC", "MINORITY", "STREET_VENDOR", "ARTISAN",
  "SHG_MEMBER", "FARMER", "AGRI_ENTREPRENEUR", "AGRICULTURE_GRADUATE",
  "AGRICULTURE_GRADUATE_GROUP", "URBAN_POOR", "URBAN_POOR_GROUP",
  "SAFAI_KARAMCHARI", "PERSON_WITH_DISABILITY",
]);

const profileSchema = z.object({
  projectCategory: z.string().trim().min(2).max(80),
  trade: z.string().trim().max(80).optional(),
  gender: z.enum(Gender),
  age: z.coerce.number().int().min(18).max(100),
  applicantTags: z.array(applicantTagSchema).max(15),
  suggestedRequestedAmount: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().positive().max(50_000_000).optional(),
  ),
  suggestedAnnualIncome: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().nonnegative().max(100_000_000).optional(),
  ),
});

export interface EligibilityActionState {
  error?: string;
}

export async function updateEligibilityProfileAction(applicationId: string, _state: EligibilityActionState, formData: FormData): Promise<EligibilityActionState> {
  const user = await requireApplicant();
  const parsed = profileSchema.safeParse({
    projectCategory: formData.get("projectCategory"), trade: formData.get("trade") || undefined,
    gender: formData.get("gender"), age: formData.get("age"), applicantTags: formData.getAll("applicantTags"),
    suggestedRequestedAmount: formData.get("requestedAmount"), suggestedAnnualIncome: formData.get("annualIncome"),
  });
  if (!parsed.success) return { error: "Check your answers. Enter an age from 18 to 100 and valid amounts; blank financial fields remain unknown." };
  const { suggestedRequestedAmount, suggestedAnnualIncome, ...profile } = parsed.data;
  const updated = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    data: { ...profile, trade: profile.trade ?? null, requestedAmount: suggestedRequestedAmount ?? null,
      annualIncome: suggestedAnnualIncome ?? null, loanSchemeId: null, channelPartnerId: null, preferredBankId: null },
  });
  if (updated.count !== 1) notFound();
  revalidatePath("/applications/new");
  redirect(`/schemes?applicationId=${encodeURIComponent(applicationId)}`);
}

const financeSchema = z.object({
  requestedAmount: z.coerce.number().positive().max(50_000_000),
  annualIncome: z.coerce.number().nonnegative().max(100_000_000),
});

const branchSearchSchema = z
  .object({
    placeId: z.string().trim().min(1).max(100).optional(),
    schemeId: z.string().trim().min(1).max(100).optional(),
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
    if (!hasLat && !value.district && !value.placeId) {
      context.addIssue({ code: "custom", message: "Provide coordinates or a district" });
    }
  });

export async function startEligibilityAction(
  previousStateOrFormData: EligibilityActionState | FormData,
  submittedFormData?: FormData,
): Promise<EligibilityActionState> {
  const user = await requireApplicant();
  // Accept the previous one-argument action shape as well. This prevents an
  // already-open development tab from crashing while hot reload catches up.
  const formData = previousStateOrFormData instanceof FormData
    ? previousStateOrFormData
    : submittedFormData;
  if (!formData) return { error: "Refresh the page and submit the eligibility form again." };
  const parsed = profileSchema.safeParse({
    projectCategory: formData.get("projectCategory"),
    trade: formData.get("trade") || undefined,
    gender: formData.get("gender"),
    age: formData.get("age"),
    applicantTags: formData.getAll("applicantTags"),
    suggestedRequestedAmount: formData.get("suggestedRequestedAmount"),
    suggestedAnnualIncome: formData.get("suggestedAnnualIncome"),
  });
  if (!parsed.success) {
    const invalidField = parsed.error.issues[0]?.path[0];
    const message = invalidField === "age"
      ? "Enter your age between 18 and 100. If this form was already open, refresh the page first."
      : "Review the eligibility form and complete every required field.";
    return { error: message };
  }

  const application = await prisma.application.create({
    data: {
      userId: user.id,
      projectCategory: parsed.data.projectCategory,
      trade: parsed.data.trade,
      gender: parsed.data.gender,
      age: parsed.data.age,
      applicantTags: parsed.data.applicantTags,
      requestedAmount: parsed.data.suggestedRequestedAmount,
      annualIncome: parsed.data.suggestedAnnualIncome,
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

  revalidatePath("/applications/new");
  redirect(`/schemes?applicationId=${encodeURIComponent(applicationId)}`);
}

export async function selectSchemeAction(
  applicationId: string,
  schemeId: string,
) {
  const user = await requireApplicant();
  const [application, scheme] = await Promise.all([
    prisma.application.findFirst({
      where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    }),
    prisma.loanScheme.findFirst({ where: { id: schemeId, isActive: true } }),
  ]);
  if (!application || !scheme) notFound();
  if (!application.projectCategory || application.requestedAmount == null || application.annualIncome == null) {
    throw new Error("Complete the eligibility profile before choosing a scheme");
  }
  const eligible = matchSchemes({
    projectCategory: application.projectCategory,
    requestedAmount: application.requestedAmount,
    annualIncome: application.annualIncome,
    trade: application.trade,
    gender: application.gender,
    age: application.age,
    applicantTags: application.applicantTags,
  }, [scheme]);
  if (eligible.length !== 1) throw new Error("This scheme is not eligible for the current application");

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT },
    data: { loanSchemeId: scheme.id, channelPartnerId: null, preferredBankId: null },
  });
  if (result.count !== 1) notFound();

  revalidatePath("/applications/new");
  redirect(`/branches?applicationId=${encodeURIComponent(applicationId)}`);
}

export async function searchBranchesAction(formData: FormData) {
  await requireApplicant();
  const parsed = branchSearchSchema.safeParse({
    schemeId: formData.get("schemeId") || undefined,
    placeId: formData.get("placeId") || undefined,
    applicationId: formData.get("applicationId") || undefined,
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    radius: formData.get("radius") || undefined,
    district: formData.get("district") || undefined,
  });
  if (!parsed.success) throw new Error("Enter valid coordinates or a district");
  const { applicationId, lat, lng, radius, district, placeId, schemeId } = parsed.data;

  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  params.set("radius", String(radius));
  if (district) params.set("district", district);
  if (placeId && lat == null && lng == null) params.set("placeId", placeId);
  if (applicationId) params.set("applicationId", applicationId);
  if (schemeId) params.set("schemeId", schemeId);
  if (formData.get("confirmedOnly") === "1" && (schemeId || applicationId)) params.set("confirmedOnly", "1");
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

  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT }, select: { loanSchemeId: true } });
  if (!application?.loanSchemeId || !await partnerSupportsScheme(branch.id, application.loanSchemeId)) {
    redirect(`/branches?applicationId=${encodeURIComponent(applicationId)}&supportError=1`);
  }

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT, loanSchemeId: application.loanSchemeId },
    data: { channelPartnerId: branch.id, preferredBankId: null },
  });
  if (result.count !== 1) notFound();

  revalidatePath("/applications/new");
  redirect(`/applications/new?applicationId=${encodeURIComponent(applicationId)}&saved=branch`);
}

export async function savePreferredBankAction(applicationId: string, bankId: string) {
  const user = await requireApplicant();
  z.string().min(1).max(100).parse(bankId);
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT }, include: { loanScheme: true },
  });
  if (!application?.loanScheme) notFound();
  const bank = await prisma.bankDirectory.findUnique({ where: { id: bankId }, select: { id: true, name: true } });
  if (!bank || isAtmListing(bank.name)) notFound();
  const lender = schemeLender(application.loanScheme.slug);
  if (lender && !new RegExp(lender.namePattern, "i").test(bank.name)) throw new Error("Choose a branch of the scheme lender");
  const support = await getBranchSchemeSupport(application.loanScheme.id, [bankId], []);
  if (support.get(`BANK:${bankId}`)?.status === "NOT_SUPPORTED") throw new Error("This branch does not support the selected scheme");
  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id, status: ApplicationStatus.DRAFT, loanSchemeId: application.loanScheme.id },
    data: { preferredBankId: bankId, channelPartnerId: null },
  });
  if (result.count !== 1) notFound();
  revalidatePath("/applications/new");
  redirect(`/applications/new?applicationId=${encodeURIComponent(applicationId)}&saved=branch`);
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
  if (!await partnerSupportsScheme(application.channelPartnerId, application.loanSchemeId)) {
    redirect(`/branches?applicationId=${encodeURIComponent(applicationId)}&supportError=1`);
  }

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.application.updateMany({
      where: { id: application.id, userId: user.id, status: ApplicationStatus.DRAFT,
        loanSchemeId: application.loanSchemeId, channelPartnerId: application.channelPartnerId },
      data: { status: ApplicationStatus.SUBMITTED, submittedAt: new Date() },
    });
    if (updated.count !== 1) throw new Error("Application changed. Refresh and review it before submitting.");
    await transaction.applicationStatusEvent.create({
      data: {
        applicationId: application.id,
        changedById: user.id,
        fromStatus: ApplicationStatus.DRAFT,
        toStatus: ApplicationStatus.SUBMITTED,
        note: "Application submitted by applicant",
      },
    });
  });
  redirect(`/applications/new?applicationId=${encodeURIComponent(application.id)}&submitted=1`);
}
