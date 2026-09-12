"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentType } from "@/generated/prisma/enums";
import { requireAshaWorker, ownedAshaCase } from "@/lib/asha/access";
import { parseCaseForm } from "@/lib/asha/forms";
import { prisma } from "@/lib/prisma";
import { evaluateEligibility } from "@/lib/matching";
import { createDocumentDownloadUrl, deleteDocumentAsset, uploadAuthenticatedDocument } from "@/lib/cloudinary";
import { ACCEPTED_DOCUMENT_TYPES, detectDocumentType, MAX_DOCUMENT_BYTES, safeOriginalFilename } from "@/lib/document-files";

export interface AshaActionState { error?: string; success?: string }
function refresh(caseId: string) { revalidatePath("/asha-worker"); revalidatePath(`/asha-worker/${caseId}`); revalidatePath("/admin"); }

export async function saveAshaCaseAction(caseId: string | null, _state: AshaActionState, form: FormData): Promise<AshaActionState> {
  const worker = await requireAshaWorker();
  const existing = caseId ? (await ownedAshaCase(caseId)).record : null;
  if (existing && existing.application.status !== "DRAFT") return { error: "Submitted answers are locked. Use the follow-up section to record a correction request." };
  if (!existing && form.get("consent") !== "yes") return { error: "Explain the assistance and record the villager's permission before saving." };
  const parsed = parseCaseForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const { name, village, phone, contactName, contactKind, ...profile } = parsed.data;
  let savedId: string;
  try {
    savedId = await prisma.$transaction(async tx => {
      if (existing) {
        const changed = await tx.application.updateMany({ where: { id: existing.applicationId, status: "DRAFT", ashaCase: { workerId: worker.id } }, data: { ...profile, loanSchemeId: null, channelPartnerId: null, preferredBankId: null } });
        if (changed.count !== 1) throw new Error("changed");
        await tx.user.update({ where: { id: existing.applicantId }, data: { name } });
        await tx.ashaCase.update({ where: { id: existing.id }, data: { village, phone: phone || null, contactKind, contactName: contactKind === "FAMILY" ? contactName : null } });
        return existing.id;
      }
      const applicant = await tx.user.create({ data: { name, role: "APPLICANT" }, select: { id: true } });
      const application = await tx.application.create({ data: { userId: applicant.id, ...profile }, select: { id: true } });
      const record = await tx.ashaCase.create({ data: { workerId: worker.id, applicantId: applicant.id, applicationId: application.id, village, phone: phone || null, contactKind, contactName: contactKind === "FAMILY" ? contactName : null, consentedAt: new Date() } });
      return record.id;
    });
  } catch { return { error: "Could not save the draft. Please retry; check the dashboard before creating a duplicate." }; }
  refresh(savedId);
  redirect(`/asha-worker/${savedId}?saved=1`);
}

export async function chooseAshaSchemeAction(caseId: string, _state: AshaActionState, form: FormData): Promise<AshaActionState> {
  const { worker, record } = await ownedAshaCase(caseId);
  if (record.application.status !== "DRAFT") return { error: "Only draft applications can change schemes." };
  const id = z.string().min(1).max(100).safeParse(form.get("schemeId"));
  if (!id.success) return { error: "Choose a scheme." };
  const scheme = await prisma.loanScheme.findFirst({ where: { id: id.data, isActive: true } });
  if (!scheme || evaluateEligibility(record.application, scheme).status !== "ELIGIBLE") return { error: "This scheme does not meet the checked requirements. Review the draft answers." };
  const result = await prisma.application.updateMany({ where: { id: record.applicationId, status: "DRAFT", ashaCase: { workerId: worker.id }, updatedAt: record.application.updatedAt }, data: { loanSchemeId: scheme.id, channelPartnerId: null, preferredBankId: null } });
  if (result.count !== 1) return { error: "The application changed. Refresh and try again." };
  refresh(caseId);
  return { success: "Scheme saved. You can now prepare documents and submit for officer review." };
}

export async function submitAshaCaseAction(caseId: string, _state: AshaActionState, form: FormData): Promise<AshaActionState> {
  const { worker, record } = await ownedAshaCase(caseId);
  if (form.get("confirmation") !== "yes") return { error: "Read back the details and confirm the villager agrees to submission." };
  const scheme = record.application.loanScheme;
  if (!scheme?.isActive || evaluateEligibility(record.application, scheme).status !== "ELIGIBLE") return { error: "Choose an eligible scheme after completing the draft details." };
  if (record.application.status !== "DRAFT") return { error: "This application has already been submitted." };
  try {
    await prisma.$transaction(async tx => {
      const updated = await tx.application.updateMany({ where: { id: record.applicationId, status: "DRAFT", ashaCase: { workerId: worker.id }, updatedAt: record.application.updatedAt }, data: { status: "SUBMITTED", submittedAt: new Date() } });
      if (updated.count !== 1) throw new Error("changed");
      await tx.applicationStatusEvent.create({ data: { applicationId: record.applicationId, changedById: worker.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", note: "ASHA-assisted application submitted for officer review after reading back details and recording the villager's confirmation. Branch arrangements and document verification remain subject to review." } });
    });
  } catch { return { error: "The application could not be submitted. Refresh its status before retrying." }; }
  refresh(caseId);
  return { success: "Submitted for officer review. This does not mean the loan is approved." };
}

export async function saveAshaFollowUpAction(caseId: string, _state: AshaActionState, form: FormData): Promise<AshaActionState> {
  const { worker } = await ownedAshaCase(caseId);
  const note = z.string().trim().max(1000).safeParse(form.get("note") ?? "");
  const dateText = String(form.get("date") ?? "");
  const date = dateText ? new Date(`${dateText}T00:00:00+05:30`) : null;
  if (!note.success || (dateText && (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !date || Number.isNaN(date.getTime())))) return { error: "Enter a valid date and a note under 1,000 characters." };
  await prisma.ashaCase.updateMany({ where: { id: caseId, workerId: worker.id }, data: { followUpAt: date, followUpNote: note.data || null } });
  refresh(caseId);
  return { success: date ? "Follow-up saved." : "Follow-up date cleared. Your note is saved." };
}

export async function uploadAshaDocumentAction(caseId: string, _state: AshaActionState, form: FormData): Promise<AshaActionState> {
  const { worker, record } = await ownedAshaCase(caseId);
  if (!["DRAFT", "SUBMITTED"].includes(record.application.status)) return { error: "Contact the reviewing officer before changing documents at this stage." };
  const type = z.enum(DocumentType).safeParse(form.get("type"));
  const file = form.get("file");
  if (!type.success || !(file instanceof File) || file.size === 0 || file.size > MAX_DOCUMENT_BYTES) return { error: "Choose a document type and a file up to 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectDocumentType(bytes);
  if (!mime || !ACCEPTED_DOCUMENT_TYPES.includes(mime) || (file.type && file.type !== mime)) return { error: "Use a genuine PDF, JPEG, PNG or WebP file." };
  let asset: Awaited<ReturnType<typeof uploadAuthenticatedDocument>> | undefined;
  try {
    asset = await uploadAuthenticatedDocument(Buffer.from(bytes), record.applicationId);
    await prisma.documentUpload.create({ data: { applicationId: record.applicationId, uploadedById: worker.id, type: type.data, originalFileName: safeOriginalFilename(file.name), storageKey: asset.publicId, storageVersion: asset.version, storageFormat: asset.format, storageResourceType: asset.resourceType, storageDeliveryType: asset.deliveryType, mimeType: mime, sizeBytes: asset.bytes, checksum: createHash("sha256").update(bytes).digest("hex") } });
  } catch {
    if (asset) await deleteDocumentAsset({ publicId: asset.publicId, resourceType: asset.resourceType, deliveryType: asset.deliveryType }).catch(() => undefined);
    return { error: "Upload failed. Please try again." };
  }
  refresh(caseId); revalidatePath(`/admin/applications/${record.applicationId}`);
  return { success: "Document uploaded for review. Earlier rejection reasons remain in the file history." };
}

export async function downloadAshaDocumentAction(caseId: string, documentId: string) {
  const { record } = await ownedAshaCase(caseId);
  const document = record.application.documents.find(doc => doc.id === documentId);
  if (!document?.storageFormat) return;
  redirect(createDocumentDownloadUrl({ publicId: document.storageKey, format: document.storageFormat, resourceType: document.storageResourceType, deliveryType: document.storageDeliveryType, filename: document.originalFileName }));
}
