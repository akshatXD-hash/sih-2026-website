import { DocumentReviewForm } from "@/components/documents/DocumentReviewForm";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addApplicationNoteAction,
  updateApplicationStatusAction,
} from "@/app/(admin)/admin/actions";
import { downloadDocumentAction } from "@/app/(applicant)/documents/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { DocumentStatus } from "@/generated/prisma/enums";
import { getAllowedStatusTransitions } from "@/lib/application-status";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  await requireAdmin();
  const { applicationId } = await params;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      loanScheme: true,
      channelPartner: true,
      documents: { orderBy: { createdAt: "desc" }, include: { verifiedBy: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
    },
  });
  if (!application) notFound();
  const transitions = getAllowedStatusTransitions(application.status);
  const statusAction = updateApplicationStatusAction.bind(null, application.id);
  const noteAction = addApplicationNoteAction.bind(null, application.id);

  return (
    <div className="space-y-7">
      <div>
        <Link className="text-sm font-bold text-teal-700 hover:underline" href="/admin">← Back to lead triage</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div><span className="eyebrow">Officer review</span><h1 className="mt-3 text-4xl font-bold text-slate-950">{application.user.name}</h1><p className="mt-2 font-mono text-sm text-slate-500">{application.referenceNumber}</p></div>
          {application.loanScheme && application.channelPartner && <a className="button-secondary" href={`/applications/${application.id}/pre-sanction`}>Download summary PDF</a>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="panel">
          <h2 className="text-xl font-bold text-slate-950">Application facts</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-sm text-slate-500">Email</dt><dd className="font-bold">{application.user.email}</dd></div>
            <div><dt className="text-sm text-slate-500">Phone</dt><dd className="font-bold">{application.user.phone ?? "Not provided"}</dd></div>
            <div><dt className="text-sm text-slate-500">Requested</dt><dd className="font-bold">{application.requestedAmount == null ? "Not provided" : INR.format(Number(application.requestedAmount))}</dd></div>
            <div><dt className="text-sm text-slate-500">Annual income</dt><dd className="font-bold">{application.annualIncome == null ? "Not provided" : INR.format(Number(application.annualIncome))}</dd></div>
            <div><dt className="text-sm text-slate-500">Scheme</dt><dd className="font-bold">{application.loanScheme?.name ?? "Not selected"}</dd></div>
            <div><dt className="text-sm text-slate-500">Branch</dt><dd className="font-bold">{application.channelPartner?.name ?? "Not selected"}</dd></div>
            <div><dt className="text-sm text-slate-500">Category</dt><dd className="font-bold">{application.projectCategory ?? "Not provided"}</dd></div>
            <div><dt className="text-sm text-slate-500">Trade</dt><dd className="font-bold">{application.trade ?? "Not provided"}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2 className="text-xl font-bold text-slate-950">Decision workflow</h2>
          <p className="mt-2 text-sm text-slate-600">Current: <strong>{application.status.replaceAll("_", " ")}</strong></p>
          {transitions.length ? (
            <form action={statusAction} className="mt-5 space-y-3">
              <select className="field" name="status" required defaultValue="" aria-label="Next application status">
                <option value="" disabled>Choose next status</option>
                {transitions.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
              <textarea className="field min-h-24 py-3" name="note" maxLength={2000} placeholder="Reason or decision note" aria-label="Reason or decision note" />
              <SubmitButton pendingLabel="Updating...">Update status</SubmitButton>
            </form>
          ) : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No further officer transition is available.</p>}
        </section>
      </div>

      <section className="panel">
        <h2 className="text-xl font-bold text-slate-950">Document verification</h2>
        {application.documents.length === 0 ? <p className="mt-4 text-sm text-slate-500">No documents uploaded.</p> : (
          <div className="mt-5 space-y-4">
            {application.documents.map((document) => {
              const download = downloadDocumentAction.bind(null, document.id);
              return (
                <article key={document.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{document.originalFileName}</p><p className="text-xs text-slate-500">{document.type.replaceAll("_", " ")} · {document.status.replaceAll("_", " ")}</p></div><form action={download}><SubmitButton className="button-secondary" pendingLabel="Opening...">Download</SubmitButton></form></div>
                  {document.failureReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{document.failureReason}</p>}
                  {document.status !== DocumentStatus.VERIFIED && document.status !== DocumentStatus.REJECTED && (
                    <DocumentReviewForm applicationId={application.id} documentId={document.id} />
                  )}
                  {document.verifiedBy && <p className="mt-3 text-xs text-slate-500">Reviewed by {document.verifiedBy.name} on {document.verifiedAt?.toLocaleString("en-IN")}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <h2 className="text-xl font-bold text-slate-950">Officer notes</h2>
          <form action={noteAction} className="mt-4 space-y-3"><textarea className="field min-h-28 py-3" name="body" minLength={2} maxLength={2000} required placeholder="Add a private review note" aria-label="Private review note" /><SubmitButton pendingLabel="Saving...">Add note</SubmitButton></form>
          <div className="mt-5 space-y-3">{application.notes.map((note) => <article className="rounded-xl bg-slate-50 p-4" key={note.id}><p className="text-sm text-slate-800">{note.body}</p><p className="mt-2 text-xs text-slate-500">{note.author.name} · {note.createdAt.toLocaleString("en-IN")}</p></article>)}</div>
        </section>
        <section className="panel">
          <h2 className="text-xl font-bold text-slate-950">Status history</h2>
          <ol className="mt-5 space-y-4 border-l-2 border-slate-200 pl-5">{application.statusHistory.map((event) => <li key={event.id}><p className="font-bold">{event.toStatus.replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{event.changedBy?.name ?? "System"} · {event.createdAt.toLocaleString("en-IN")}</p>{event.note && <p className="mt-1 text-sm text-slate-700">{event.note}</p>}</li>)}</ol>
        </section>
      </div>
    </div>
  );
}
