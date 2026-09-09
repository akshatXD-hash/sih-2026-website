import { DocumentStatus, DocumentType } from "@/generated/prisma/enums";
import {
  confirmDocumentExtractionAction,
  downloadDocumentAction,
  processDocumentOcrAction,
} from "@/app/(applicant)/documents/actions";
import { ocrCertificateResponseSchema } from "@/lib/ai-service/contracts";
import { SubmitButton } from "@/components/forms/SubmitButton";

interface ApplicationDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  originalFileName: string;
  sizeBytes: number;
  extractedData: unknown;
  failureReason: string | null;
  ocrConfirmedAt: Date | null;
  verifiedAt: Date | null;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ApplicationDocuments({
  applicationId,
  documents,
  canManage = true,
}: {
  applicationId: string;
  documents: ApplicationDocument[];
  canManage?: boolean;
}) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Uploaded documents</h2>
          <p className="mt-1 text-sm text-slate-600">Track officer decisions and correction reasons for each file.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
          {documents.length}
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No documents uploaded yet.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {documents.map((document) => {
            const extracted = ocrCertificateResponseSchema.safeParse(document.extractedData);
            const supportsOcr =
              document.type === DocumentType.CASTE_CERTIFICATE ||
              document.type === DocumentType.INCOME_PROOF;
            const processAction = processDocumentOcrAction.bind(null, applicationId, document.id);
            const confirmAction = confirmDocumentExtractionAction.bind(null, applicationId, document.id);
            const downloadAction = downloadDocumentAction.bind(null, document.id);

            return (
              <article key={document.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{document.originalFileName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.type.replaceAll("_", " ")} · {formatBytes(document.sizeBytes)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${document.status === DocumentStatus.REJECTED ? "bg-red-100 text-red-800" : document.status === DocumentStatus.VERIFIED ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-700"}`}>
                    {document.status.replaceAll("_", " ")}
                  </span>
                </div>

                {extracted.success && (
                  <dl className="mt-4 grid gap-2 rounded-xl bg-teal-50 p-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-teal-700">Name</dt><dd className="font-bold text-teal-950">{extracted.data.extracted_fields.name || "Not detected"}</dd></div>
                    <div><dt className="text-teal-700">Confidence</dt><dd className="font-bold text-teal-950">{Math.round(extracted.data.raw_confidence * 100)}%</dd></div>
                    {extracted.data.extracted_fields.category && <div><dt className="text-teal-700">Category</dt><dd className="font-bold text-teal-950">{extracted.data.extracted_fields.category}</dd></div>}
                    {extracted.data.extracted_fields.annual_income != null && <div><dt className="text-teal-700">Annual income</dt><dd className="font-bold text-teal-950">INR {extracted.data.extracted_fields.annual_income.toLocaleString("en-IN")}</dd></div>}
                  </dl>
                )}

                {document.failureReason && (
                  <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{document.status === DocumentStatus.REJECTED ? "Rejection reason: " : "Processing issue: "}{document.failureReason}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={downloadAction}>
                    <SubmitButton className="button-secondary" pendingLabel="Opening...">Download</SubmitButton>
                  </form>
                  {canManage && supportsOcr && document.status !== DocumentStatus.PROCESSING && !document.ocrConfirmedAt && document.status !== DocumentStatus.VERIFIED && document.status !== DocumentStatus.REJECTED && (
                    <form action={processAction}>
                      <SubmitButton className="button-secondary" pendingLabel="Processing...">
                        {document.status === DocumentStatus.FAILED ? "Retry OCR" : "Extract with AI"}
                      </SubmitButton>
                    </form>
                  )}
                  {canManage && extracted.success && !document.ocrConfirmedAt && document.status !== DocumentStatus.REJECTED && document.status !== DocumentStatus.VERIFIED && (
                    <form action={confirmAction}>
                      <SubmitButton pendingLabel="Confirming...">
                        {document.type === DocumentType.INCOME_PROOF
                          ? "Confirm and apply income"
                          : "Confirm extracted details"}
                      </SubmitButton>
                    </form>
                  )}
                  {document.ocrConfirmedAt && (
                    <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800">
                      Applicant confirmed
                    </span>
                  )}
                  {document.verifiedAt && (
                    <span className="inline-flex items-center rounded-xl bg-blue-50 px-3 text-sm font-bold text-blue-800">
                      {document.status === DocumentStatus.REJECTED ? "Officer rejected" : document.status === DocumentStatus.VERIFIED ? "Officer verified" : "Officer reviewed"} · {document.verifiedAt.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
