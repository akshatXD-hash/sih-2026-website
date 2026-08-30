"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { ApplicationStatus, DocumentStatus, DocumentType } from "@/generated/prisma/enums";
import { getAiService, ocrCertificateResponseSchema } from "@/lib/ai-service";
import { getCurrentUser, requireApplicant } from "@/lib/auth/guards";
import { hasAdminAccess } from "@/lib/auth/roles";
import {
  createDocumentDownloadUrl,
  deleteDocumentAsset,
  uploadAuthenticatedDocument,
} from "@/lib/cloudinary";
import {
  ACCEPTED_DOCUMENT_TYPES,
  detectDocumentType,
  MAX_DOCUMENT_BYTES,
  safeOriginalFilename,
} from "@/lib/document-files";
import { prisma } from "@/lib/prisma";

export interface DocumentActionState {
  message?: string;
  success?: boolean;
}

const uploadSchema = z.object({ type: z.enum(DocumentType) });
const applicantUploadStatuses = [ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED];

export async function uploadDocumentAction(
  applicationId: string,
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireApplicant();
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id, status: { in: applicantUploadStatuses } },
    select: { id: true },
  });
  if (!application) notFound();

  const parsed = uploadSchema.safeParse({ type: formData.get("type") });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) {
    return { message: "Choose a document type and file." };
  }
  if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) {
    return { message: "The file must be between 1 byte and 5 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectDocumentType(bytes);
  if (!detectedType || !ACCEPTED_DOCUMENT_TYPES.includes(detectedType)) {
    return { message: "Upload a genuine PDF, JPEG, PNG, or WebP file." };
  }
  if (file.type && file.type !== detectedType) {
    return { message: "The file contents do not match its declared format." };
  }

  const originalFileName = safeOriginalFilename(file.name);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  let asset: Awaited<ReturnType<typeof uploadAuthenticatedDocument>> | undefined;

  try {
    asset = await uploadAuthenticatedDocument(Buffer.from(bytes), application.id);
    await prisma.documentUpload.create({
      data: {
        applicationId: application.id,
        uploadedById: user.id,
        type: parsed.data.type,
        originalFileName,
        storageKey: asset.publicId,
        storageVersion: asset.version,
        storageFormat: asset.format,
        storageResourceType: asset.resourceType,
        storageDeliveryType: asset.deliveryType,
        mimeType: detectedType,
        sizeBytes: asset.bytes,
        checksum,
      },
    });
  } catch {
    if (asset) {
      await deleteDocumentAsset({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        deliveryType: asset.deliveryType,
      }).catch(() => undefined);
    }
    return { message: "The document could not be stored. Please try again." };
  }

  revalidatePath(`/applications/new`);
  return { message: "Document uploaded securely.", success: true };
}

export async function processDocumentOcrAction(applicationId: string, documentId: string) {
  const user = await requireApplicant();
  const document = await prisma.documentUpload.findFirst({
    where: {
      id: documentId,
      applicationId,
      application: { userId: user.id, status: { in: applicantUploadStatuses } },
      type: { in: [DocumentType.CASTE_CERTIFICATE, DocumentType.INCOME_PROOF] },
      ocrConfirmedAt: null,
      status: { notIn: [DocumentStatus.PROCESSING, DocumentStatus.VERIFIED, DocumentStatus.REJECTED] },
    },
  });
  if (!document || !document.storageFormat) notFound();

  await prisma.documentUpload.update({
    where: { id: document.id },
    data: { status: DocumentStatus.PROCESSING, failureReason: null },
  });

  try {
    const downloadUrl = createDocumentDownloadUrl({
      publicId: document.storageKey,
      format: document.storageFormat,
      resourceType: document.storageResourceType,
      deliveryType: document.storageDeliveryType,
      filename: document.originalFileName,
    });
    const response = await fetch(downloadUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Stored document could not be read");
    const file = new Blob([await response.arrayBuffer()], { type: document.mimeType });
    const result = await getAiService().ocrCertificate({
      file,
      filename: document.originalFileName,
      docType: document.type === DocumentType.CASTE_CERTIFICATE ? "caste" : "income",
    });

    await prisma.documentUpload.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.PROCESSED,
        extractedData: structuredClone(result),
        failureReason: null,
      },
    });
  } catch {
    await prisma.documentUpload.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.FAILED,
        failureReason: "OCR service could not process this document.",
      },
    });
  }

  revalidatePath(`/applications/new`);
}

export async function confirmDocumentExtractionAction(applicationId: string, documentId: string) {
  const user = await requireApplicant();
  const document = await prisma.documentUpload.findFirst({
    where: {
      id: documentId,
      applicationId,
      application: { userId: user.id, status: { in: applicantUploadStatuses } },
      status: DocumentStatus.PROCESSED,
      ocrConfirmedAt: null,
    },
    select: { id: true, type: true, extractedData: true },
  });
  if (!document) notFound();
  const extracted = ocrCertificateResponseSchema.safeParse(document.extractedData);
  if (!extracted.success) throw new Error("The extracted data is no longer valid");

  await prisma.$transaction(async (transaction) => {
    await transaction.documentUpload.update({
      where: { id: document.id },
      data: { ocrConfirmedAt: new Date() },
    });
    if (
      document.type === DocumentType.INCOME_PROOF &&
      extracted.data.extracted_fields.annual_income != null
    ) {
      await transaction.application.updateMany({
        where: { id: applicationId, userId: user.id },
        data: { annualIncome: extracted.data.extracted_fields.annual_income },
      });
    }
  });

  revalidatePath(`/applications/new`);
}

export async function downloadDocumentAction(documentId: string) {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  const document = await prisma.documentUpload.findUnique({
    where: { id: documentId },
    include: { application: { select: { userId: true } } },
  });
  if (!document || !document.storageFormat) notFound();
  if (document.application.userId !== user.id && !hasAdminAccess(user.role)) notFound();

  redirect(createDocumentDownloadUrl({
    publicId: document.storageKey,
    format: document.storageFormat,
    resourceType: document.storageResourceType,
    deliveryType: document.storageDeliveryType,
    filename: document.originalFileName,
  }));
}
