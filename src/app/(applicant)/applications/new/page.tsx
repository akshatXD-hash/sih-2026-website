import { buildActionPlan } from "@/lib/action-plan";
import { ApplicationSection } from "@/components/applications/ApplicationSection";
import { SubmitButton } from "@/components/forms/SubmitButton";
import Link from "next/link";
import { ActionPlan } from "@/components/applications/ActionPlan";
import { notFound, redirect } from "next/navigation";

import { submitApplicationAction } from "@/app/(applicant)/actions";
import { ApplicationDocuments } from "@/components/documents/ApplicationDocuments";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { EmiCalculator } from "@/components/finance/EmiCalculator";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string; submitted?: string; saved?: string }>;
}) {
  const user = await requireApplicant();
  const { applicationId, submitted, saved } = await searchParams;
  if (!applicationId) {
    const latestApplication = await prisma.application.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (latestApplication) {
      redirect(`/applications/new?applicationId=${encodeURIComponent(latestApplication.id)}`);
    }
    return (
      <section className="panel mx-auto max-w-2xl text-center">
        <span className="eyebrow">Application flow</span>
        <h1 className="mt-4 text-3xl font-bold">Start with eligibility</h1>
        <p className="mt-3 text-slate-600">A draft application is created by the eligibility wizard.</p>
        <Link className="button-primary mt-6" href="/eligibility">Start eligibility check</Link>
      </section>
    );
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    include: {
      loanScheme: true,
      preferredBank: { select: { id: true, name: true } },
      planTasks: true,
      competencies: true,
      channelPartner: true,
      documents: { orderBy: { createdAt: "desc" } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!application) notFound();
  const reviewedDocuments = application.documents.filter(document => document.status === "REJECTED" || document.status === "VERIFIED")
    .sort((a, b) => (b.verifiedAt?.getTime() ?? 0) - (a.verifiedAt?.getTime() ?? 0));
  const rejectedCount = reviewedDocuments.filter(document => document.status === "REJECTED").length;
  const documentTasks = buildActionPlan(application).required.filter(task => task.key.startsWith("document:"));
  const submit = submitApplicationAction.bind(null, application.id);
  const principal = application.requestedAmount == null ? null : Number(application.requestedAmount);
  const rawRate = application.loanScheme?.interestRateMin == null
    ? 6.5
    : Number(application.loanScheme.interestRateMin);
  const initialRate = Math.max(6.5, Math.min(8, rawRate));
  const initialTenure = application.loanScheme?.tenureMonthsMax ?? 60;
  const canManageDocuments =
    application.status === ApplicationStatus.DRAFT ||
    application.status === ApplicationStatus.SUBMITTED;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <span className="eyebrow">Application review</span>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">My application</h1>
            <p className="mt-2 text-sm text-slate-600">{application.status.replaceAll("_", " ")}</p>
          </div>

        </div>
        {saved === "branch" && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">✓ Branch choice saved. {application.preferredBankId ? "Scheme support still needs confirmation before online submission." : "Your checklist has been updated."}</p>}
        {submitted === "1" && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">
            Application submitted successfully.
          </p>
        )}
      </div>

      <dl className="panel grid gap-5 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">Scheme</dt><dd className="mt-1 font-bold">{application.loanScheme?.name ?? "Not selected"}</dd></div>
        <div><dt className="text-sm text-slate-500">Requested amount</dt><dd className="mt-1 font-bold">{principal == null ? "Not entered" : INR.format(principal)}</dd></div>
        <div><dt className="text-sm text-slate-500">Branch</dt><dd className="mt-1 font-bold">{application.channelPartner?.name ?? application.preferredBank?.name ?? <span className="font-medium text-amber-700">Not selected</span>}</dd></div>
      </dl>


      {application.status === ApplicationStatus.DRAFT && (
        <div className="rounded-xl bg-teal-50 p-4">
          <p className="mb-3 text-sm text-teal-900">{!application.loanSchemeId ? "Next: choose a scheme that fits your needs." : !application.channelPartnerId ? application.preferredBankId ? "Preferred branch saved. Contact the branch to confirm support, or choose a confirmed application partner to submit online." : "Next: select a branch for this scheme." : "Review your documents, then submit when you are ready."}</p>
          {!application.loanSchemeId ? <Link className="button-primary" href={"/schemes?applicationId=" + encodeURIComponent(application.id)}>Choose scheme</Link> : !application.channelPartnerId ? <Link className="button-primary" href={"/branches?applicationId=" + encodeURIComponent(application.id)}>{application.preferredBankId ? "Review branch choice" : "Choose branch"}</Link> : <form action={submit}><SubmitButton pendingLabel="Submitting…">Submit application</SubmitButton></form>}
        </div>
      )}

      {reviewedDocuments.length > 0 && <section className="panel" aria-label="Document review updates">
        <h2 className="text-lg font-bold">Document review updates</h2>
        <p className="mt-2 text-sm text-slate-600">{reviewedDocuments.length - rejectedCount} verified · {rejectedCount} rejected</p>
        <ul className="mt-3 space-y-3">{reviewedDocuments.slice(0, 3).map(document => <li key={document.id} className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold">{document.status === "REJECTED" ? "Needs correction" : "✓ Verified"}: {document.originalFileName}</p>
          {document.status === "REJECTED" && <p className="mt-1 text-red-800">Reason: {document.failureReason || "Contact the reviewer for details."}</p>}
          {document.verifiedAt && <p className="mt-1 text-xs text-slate-500">Reviewed {document.verifiedAt.toLocaleString("en-IN")}</p>}
        </li>)}</ul>
        <p className="mt-3 text-sm text-slate-600">{rejectedCount ? canManageDocuments ? "Upload a corrected copy for rejected files. Previous reviews remain visible below." : "Contact your branch about correcting rejected files at this application stage." : "These documents have been verified by an officer."}</p>
        <Link className="mt-3 inline-block font-semibold text-teal-700 underline" href={"/applications/new?applicationId=" + encodeURIComponent(application.id) + "#documents"}>View all files and review results</Link>
      </section>}

      <ActionPlan application={application} />

      <ApplicationSection id="documents" title="Upload documents & view files" hint={application.documents.length + " files saved"}>
      {documentTasks.length > 0 && <ul className="mb-5 space-y-2 text-sm" aria-label="Required document status">{documentTasks.map(task => <li key={task.key}>
        <span className={task.done ? "font-semibold text-teal-700" : "font-semibold text-slate-800"}>{task.done ? "✓ " : "○ "}{task.title.replace(/^Prepare /, "")}</span>
        <p className="text-xs text-slate-500">{task.detail}</p>
      </li>)}</ul>}
      <div className={canManageDocuments ? "grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" : "grid gap-6"}>
        {canManageDocuments && <DocumentUploadForm applicationId={application.id} />}
        <ApplicationDocuments
          applicationId={application.id}
          documents={application.documents}
          canManage={canManageDocuments}
        />
      </div>

      </ApplicationSection>

      {principal != null && application.loanScheme && (
        <ApplicationSection id="repayment" title="Estimate monthly repayments" hint="Optional">
        <EmiCalculator
          principal={principal}
          initialRate={initialRate}
          initialTenure={initialTenure}
          gender={application.gender}
        />
        </ApplicationSection>
      )}

      <ApplicationSection id="application-details" title="Application details & history">
        <p className="text-sm text-slate-500">Reference {application.referenceNumber}</p>
        <p className="mt-2 text-sm">Annual income: {application.annualIncome == null ? "Not entered" : INR.format(Number(application.annualIncome))} · Project: {application.projectCategory ?? "Not entered"}</p>
        {application.status === ApplicationStatus.DRAFT && <div className="my-4 flex flex-wrap gap-4 text-sm font-semibold text-teal-700">
          <Link href={"/applications/" + encodeURIComponent(application.id) + "/profile"}>Edit answers</Link>
          <Link href={"/schemes?applicationId=" + encodeURIComponent(application.id)}>Change scheme</Link>
          {application.loanSchemeId && <Link href={"/branches?applicationId=" + encodeURIComponent(application.id)}>Change branch</Link>}
        </div>}
        {application.loanScheme && application.channelPartner && <a className="my-4 inline-block text-sm font-semibold text-teal-700 underline" href={"/applications/" + encodeURIComponent(application.id) + "/pre-sanction"}>Download pre-sanction summary</a>}
        <h2 className="mt-4 font-bold">Status history</h2>
        {application.statusHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No recorded status changes yet.</p>
        ) : (
          <ol className="mt-5 space-y-4 border-l-2 border-slate-200 pl-5">
            {application.statusHistory.map((event) => (
              <li key={event.id}>
                <p className="font-bold text-slate-900">{event.toStatus.replaceAll("_", " ")}</p>
                <p className="text-sm text-slate-500">
                  {event.createdAt.toLocaleString("en-IN")} · {event.changedBy?.name ?? "System"}
                </p>
                {event.note && <p className="mt-1 text-sm text-slate-700">{event.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </ApplicationSection>
    </div>
  );
}
