import Link from "next/link";
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
  searchParams: Promise<{ applicationId?: string; submitted?: string }>;
}) {
  const user = await requireApplicant();
  const { applicationId, submitted } = await searchParams;
  if (!applicationId) {
    const latestApplication = await prisma.application.findFirst({
      where: {
        userId: user.id,
        status: { in: [ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED] },
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
      channelPartner: true,
      documents: { orderBy: { createdAt: "desc" } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!application) notFound();
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
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <span className="eyebrow">Application review</span>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">Review your application</h1>
            <p className="mt-2 text-slate-600">Reference {application.referenceNumber}</p>
          </div>
          {application.loanScheme && application.channelPartner && (
            <a
              className="button-secondary"
              href={`/applications/${encodeURIComponent(application.id)}/pre-sanction`}
            >
              Download pre-sanction summary
            </a>
          )}
        </div>
        {submitted === "1" && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">
            Application submitted successfully.
          </p>
        )}
      </div>

      <dl className="panel grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-sm text-slate-500">Status</dt><dd className="mt-1 font-bold">{application.status.replaceAll("_", " ")}</dd></div>
        <div><dt className="text-sm text-slate-500">Scheme</dt><dd className="mt-1 font-bold">{application.loanScheme?.name ?? "Not selected"}</dd></div>
        <div><dt className="text-sm text-slate-500">Requested amount</dt><dd className="mt-1 font-bold">{principal == null ? "Not entered" : INR.format(principal)}</dd></div>
        <div><dt className="text-sm text-slate-500">Annual income</dt><dd className="mt-1 font-bold">{application.annualIncome == null ? "Not entered" : INR.format(Number(application.annualIncome))}</dd></div>
        <div><dt className="text-sm text-slate-500">Project category</dt><dd className="mt-1 font-bold">{application.projectCategory ?? "Not entered"}</dd></div>
        <div><dt className="text-sm text-slate-500">Branch</dt><dd className="mt-1 font-bold">{application.channelPartner?.name ?? <span className="font-medium text-amber-700">Not selected</span>}</dd></div>
      </dl>

      {application.status === ApplicationStatus.DRAFT && (
        <div className="flex flex-wrap gap-3">
          <form action={submit}>
            <button className="button-primary" type="submit" disabled={!application.loanSchemeId || !application.channelPartnerId}>
              Submit application
            </button>
          </form>
          <Link className="button-secondary" href={`/branches?applicationId=${encodeURIComponent(application.id)}`}>
            {application.channelPartnerId ? "Change branch" : "Select branch"}
          </Link>
          <Link className="button-secondary" href={`/schemes?applicationId=${encodeURIComponent(application.id)}`}>
            Change scheme
          </Link>
        </div>
      )}

      <div className={canManageDocuments ? "grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" : "grid gap-6"}>
        {canManageDocuments && <DocumentUploadForm applicationId={application.id} />}
        <ApplicationDocuments
          applicationId={application.id}
          documents={application.documents}
          canManage={canManageDocuments}
        />
      </div>

      {principal != null && application.loanScheme && (
        <EmiCalculator
          principal={principal}
          initialRate={initialRate}
          initialTenure={initialTenure}
          gender={application.gender}
        />
      )}

      <section className="panel">
        <h2 className="text-xl font-bold text-slate-950">Application history</h2>
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
      </section>
    </div>
  );
}
