import Link from "next/link";
import { notFound } from "next/navigation";

import { submitApplicationAction } from "@/app/(applicant)/actions";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<{ applicationId?: string; submitted?: string }> }) {
  const user = await requireApplicant();
  const { applicationId, submitted } = await searchParams;
  if (!applicationId) {
    return <section className="panel mx-auto max-w-2xl text-center"><span className="eyebrow">Application flow</span><h1 className="mt-4 text-3xl font-bold">Start with eligibility</h1><p className="mt-3 text-slate-600">A draft application is created by the eligibility wizard.</p><Link className="button-primary mt-6" href="/eligibility">Start eligibility check</Link></section>;
  }

  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { loanScheme: true, channelPartner: true } });
  if (!application) notFound();
  const submit = submitApplicationAction.bind(null, application.id);

  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow">Application review</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Review your draft</h1>
      {submitted === "1" && <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">Application submitted successfully.</p>}
      <dl className="panel mt-8 grid gap-5 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">Reference</dt><dd className="mt-1 font-bold">{application.referenceNumber}</dd></div>
        <div><dt className="text-sm text-slate-500">Status</dt><dd className="mt-1 font-bold">{application.status.replaceAll("_", " ")}</dd></div>
        <div><dt className="text-sm text-slate-500">Scheme</dt><dd className="mt-1 font-bold">{application.loanScheme?.name ?? "Not selected"}</dd></div>
        <div><dt className="text-sm text-slate-500">Requested amount</dt><dd className="mt-1 font-bold">{application.requestedAmount ? inr.format(Number(application.requestedAmount.toString())) : "Not entered"}</dd></div>
        <div><dt className="text-sm text-slate-500">Project category</dt><dd className="mt-1 font-bold">{application.projectCategory ?? "Not entered"}</dd></div>
        <div>
          <dt className="text-sm text-slate-500">Branch</dt>
          <dd className="mt-1 font-bold">
            {application.channelPartner?.name ?? (
              <span className="text-amber-700 font-medium">Not selected</span>
            )}
          </dd>
        </div>
      </dl>
      {application.status === ApplicationStatus.DRAFT && (
        <form action={submit} className="mt-6 flex flex-wrap gap-3">
          <button className="button-primary" type="submit" disabled={!application.loanSchemeId}>
            Submit application
          </button>
          <Link
            className="button-secondary"
            href={`/branches?applicationId=${encodeURIComponent(application.id)}`}
          >
            {application.channelPartnerId ? "Change branch" : "Select branch"}
          </Link>
          <Link
            className="button-secondary"
            href={`/schemes?applicationId=${encodeURIComponent(application.id)}`}
          >
            Change scheme
          </Link>
        </form>
      )}
    </div>
  );
}
