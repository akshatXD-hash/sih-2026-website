import { notFound } from "next/navigation";

import { selectSchemeAction } from "@/app/(applicant)/actions";
import { requireApplicant } from "@/lib/auth/guards";
import { matchSchemes } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function SchemesPage({ searchParams }: { searchParams: Promise<{ applicationId?: string }> }) {
  const user = await requireApplicant();
  const { applicationId } = await searchParams;
  const schemes = await prisma.loanScheme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const application = applicationId
    ? await prisma.application.findFirst({ where: { id: applicationId, userId: user.id } })
    : null;
  if (applicationId && !application) notFound();

  const matches = application?.projectCategory && application.requestedAmount != null && application.annualIncome != null
    ? matchSchemes({
        projectCategory: application.projectCategory,
        requestedAmount: application.requestedAmount,
        annualIncome: application.annualIncome,
        trade: application.trade,
        gender: application.gender,
      }, schemes)
    : [];
  const displayedSchemes = matches.length > 0 ? matches.map((match) => match.scheme) : schemes;

  return (
    <div>
      <span className="eyebrow">Scheme finder</span>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-4xl font-bold tracking-tight text-slate-950">{matches.length ? `${matches.length} eligible matches` : "Available schemes"}</h1><p className="mt-2 text-slate-600">Hard eligibility rules are applied before ranking. No AI model approves a loan.</p></div>
      </div>
      {application && matches.length === 0 && <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No scheme passed every hard rule. The catalog is shown for reference, but unavailable schemes cannot be selected.</p>}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {displayedSchemes.map((scheme) => {
          const match = matches.find((item) => item.scheme.id === scheme.id);
          const action = application && match ? selectSchemeAction.bind(null, application.id, scheme.id) : undefined;
          return (
            <article className="panel flex flex-col" key={scheme.id}>
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{scheme.category.replaceAll("_", " ")}</p><h2 className="mt-2 text-xl font-bold text-slate-950">{scheme.name}</h2><p className="mt-1 text-sm text-slate-500">{scheme.provider}</p></div>{match && <span className="rounded-lg bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">Fit {match.rankScore.toFixed(0)}</span>}</div>
              <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{scheme.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><p className="text-slate-500">Maximum</p><p className="font-bold text-slate-900">{inr.format(Number(scheme.maxAmount.toString()))}</p></div><div><p className="text-slate-500">Rate range</p><p className="font-bold text-slate-900">{scheme.interestRateMin?.toString() ?? "—"}%–{scheme.interestRateMax?.toString() ?? "—"}%</p></div></div>
              {action && <form action={action} className="mt-5"><button className="button-primary w-full" type="submit">Choose this scheme</button></form>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
