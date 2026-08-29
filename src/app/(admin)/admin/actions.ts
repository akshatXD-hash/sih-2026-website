"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ApplicationStatus, DocumentStatus } from "@/generated/prisma/enums";
import { canTransitionApplication } from "@/lib/application-status";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().trim().min(1).max(100);
const noteSchema = z.string().trim().min(2).max(2_000);
const statusSchema = z.enum(ApplicationStatus);

export async function addApplicationNoteAction(applicationId: string, formData: FormData) {
  const user = await requireAdmin();
  const parsedId = idSchema.safeParse(applicationId);
  const parsedBody = noteSchema.safeParse(formData.get("body"));
  if (!parsedId.success || !parsedBody.success) throw new Error("Enter a valid officer note");

  const application = await prisma.application.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  });
  if (!application) notFound();
  await prisma.applicationNote.create({
    data: { applicationId: application.id, authorId: user.id, body: parsedBody.data },
  });
  revalidatePath(`/admin/applications/${application.id}`);
}

export async function updateApplicationStatusAction(applicationId: string, formData: FormData) {
  const user = await requireAdmin();
  const parsedId = idSchema.safeParse(applicationId);
  const parsedStatus = statusSchema.safeParse(formData.get("status"));
  const noteValue = formData.get("note");
  const parsedNote = noteValue ? noteSchema.safeParse(noteValue) : null;
  if (!parsedId.success || !parsedStatus.success || (parsedNote && !parsedNote.success)) {
    throw new Error("Enter a valid status update");
  }

  const application = await prisma.application.findUnique({
    where: { id: parsedId.data },
    select: { id: true, status: true },
  });
  if (!application) notFound();
  if (!canTransitionApplication(application.status, parsedStatus.data)) {
    throw new Error(`Cannot move an application from ${application.status} to ${parsedStatus.data}`);
  }

  const decided =
    parsedStatus.data === ApplicationStatus.APPROVED ||
    parsedStatus.data === ApplicationStatus.REJECTED;
  await prisma.$transaction(async (transaction) => {
    await transaction.application.update({
      where: { id: application.id },
      data: {
        status: parsedStatus.data,
        decidedAt: decided
          ? new Date()
          : parsedStatus.data === ApplicationStatus.UNDER_REVIEW
            ? null
            : undefined,
      },
    });
    await transaction.applicationStatusEvent.create({
      data: {
        applicationId: application.id,
        changedById: user.id,
        fromStatus: application.status,
        toStatus: parsedStatus.data,
        note: parsedNote?.success ? parsedNote.data : null,
      },
    });
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/applications/${application.id}`);
}

export async function reviewDocumentAction(
  applicationId: string,
  documentId: string,
  formData: FormData,
) {
  const user = await requireAdmin();
  const parsedApplicationId = idSchema.safeParse(applicationId);
  const parsedDocumentId = idSchema.safeParse(documentId);
  const decision = z.enum(["verify", "reject"]).safeParse(formData.get("decision"));
  const reason = z.string().trim().max(500).optional().safeParse(formData.get("reason") || undefined);
  if (!parsedApplicationId.success || !parsedDocumentId.success || !decision.success || !reason.success) {
    throw new Error("Invalid document decision");
  }
  if (decision.data === "reject" && !reason.data) {
    throw new Error("Give the applicant a reason when rejecting a document");
  }

  const result = await prisma.documentUpload.updateMany({
    where: {
      id: parsedDocumentId.data,
      applicationId: parsedApplicationId.data,
      status: { notIn: [DocumentStatus.VERIFIED, DocumentStatus.REJECTED] },
    },
    data: {
      status: decision.data === "verify" ? DocumentStatus.VERIFIED : DocumentStatus.REJECTED,
      verifiedById: user.id,
      verifiedAt: new Date(),
      failureReason: decision.data === "reject" ? reason.data : null,
    },
  });
  if (result.count !== 1) notFound();
  revalidatePath(`/admin/applications/${parsedApplicationId.data}`);
}
