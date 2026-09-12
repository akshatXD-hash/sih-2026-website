
import { T } from "@/components/language/LanguageProvider";
import { Suspense } from "react";
import Link from "next/link";
import { EligibilityExplanation, eligibilityLabels } from "@/components/schemes/EligibilityExplanation";
import { notFound } from "next/navigation";

import { selectSchemeAction } from "@/app/(applicant)/actions";
import { RecommendationExplainer } from "@/components/ai/RecommendationExplainer";
import { TermSimplifier } from "@/components/ai/TermSimplifier";
import { Pagination } from "@/components/schemes/Pagination";
import { SchemeFilters } from "@/components/schemes/SchemeFilters";
import { requireApplicant } from "@/lib/auth/guards";
import { evaluateEligibility, matchSchemes } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import {
  filterAndPaginateSchemes,
  type SchemeCatalogItem,
  type SchemeSortOption,
} from "@/lib/scheme-catalogue";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PAGE_SIZE = 8;

export default async function SchemesPage({
  searchParams,
}: {
  searchParams: Promise<{
    applicationId?: string;
    category?: string;
    q?: string;
    sort?: string;
    page?: string;
    status?: string;
  }>;
}) {
  const user = await requireApplicant();
  const { applicationId, category, q, sort, page, status } = await searchParams;

  const [schemes, application] = await Promise.all([
    prisma.loanScheme.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    applicationId
      ? prisma.application.findFirst({
          where: { id: applicationId, userId: user.id },
        })
      : null,
  ]);

  if (applicationId && !application) notFound();

  const matches =
    application?.projectCategory &&
    application.requestedAmount != null &&
    application.annualIncome != null
      ? matchSchemes(
          {
            projectCategory: application.projectCategory,
            requestedAmount: application.requestedAmount,
            annualIncome: application.annualIncome,
            trade: application.trade,
            gender: application.gender,
            age: application.age,
            applicantTags: application.applicantTags,
          },
          schemes,
        )
      : [];

  const assessments = new Map(schemes.map(scheme => [scheme.id, application ? evaluateEligibility(application, scheme) : null]));
  const selectedStatus = status && Object.hasOwn(eligibilityLabels, status) ? status : "ALL";
  const matchMap = new Map(matches.map(match => [match.scheme.id, match]));
  const catalogItems: SchemeCatalogItem[] = schemes
    .filter(scheme => selectedStatus === "ALL" || assessments.get(scheme.id)?.status === selectedStatus)
    .map(scheme => ({ scheme, match: matchMap.get(scheme.id) }));
  const statusHref = (value: string) => {
    const params = new URLSearchParams();
    if (applicationId) params.set("applicationId", applicationId);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    params.set("status", value);
    return "/schemes?" + params.toString();
  };

  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const paginated = filterAndPaginateSchemes(catalogItems, {
    category,
    searchQuery: q,
    sortBy: sort as SchemeSortOption,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  return (
    <div>
      <span className="eyebrow"><T>Scheme finder</T></span>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            {matches.length > 0
              ? `${matches.length} eligible matches`
              : <T>Available schemes</T>}
          </h1>
          <p className="mt-2 text-slate-600">
            Hard eligibility rules are applied before ranking. No AI model
            approves a loan.
          </p>
        </div>
      </div>

      {application && matches.length === 0 && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No scheme passed every hard rule. The catalog is shown for reference,
          but unavailable schemes cannot be selected.
        </p>
      )}

      {application && matches.length > 0 && (
        <RecommendationExplainer applicationId={application.id} />
      )}

      {application && <nav aria-label="Eligibility results" className="mt-6 flex flex-wrap gap-3">
        {[["ALL", "All schemes"], ...Object.entries(eligibilityLabels)].map(([key, label]) => <Link key={key} href={statusHref(key)} aria-current={selectedStatus === key ? "page" : undefined} className={selectedStatus === key ? "button-primary" : "button-secondary"}><T>{label}</T> ({key === "ALL" ? schemes.length : [...assessments.values()].filter(a => a?.status === key).length})</Link>)}
        <Link className="button-secondary" href={`/applications/new?applicationId=${encodeURIComponent(application.id)}#action-plan`}>My skill readiness & action plan</Link>
      </nav>}

      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-slate-100 mt-6" />}>
        <SchemeFilters hasMatches={matches.length > 0} />
      </Suspense>

      {paginated.items.length === 0 ? (
        <div className="panel mt-8 text-center py-12">
          <p className="text-lg font-bold text-slate-900">
            No schemes found matching your criteria
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Try adjusting your search query or removing category filters.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {paginated.items.map(({ scheme, match }) => {
            const action =
              application?.status === "DRAFT" && match
                ? selectSchemeAction.bind(null, application.id, scheme.id)
                : undefined;
            return (
              <article className="panel flex flex-col" key={scheme.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                      {scheme.category.replaceAll("_", " ")}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                      {scheme.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {scheme.provider}
                    </p>
                  </div>
                  {match && (
                    <span className="rounded-lg bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">
                      Fit {match.rankScore.toFixed(0)}
                    </span>
                  )}
                </div>
                <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                  {scheme.description}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-slate-500"><T>Maximum</T></p>
                    <p className="font-bold text-slate-900">
                      {inr.format(Number(scheme.maxAmount.toString()))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500"><T>Indicative rate</T></p>
                    <p className="font-bold text-slate-900">
                      {scheme.interestRateMin == null &&
                      scheme.interestRateMax == null
                        ? "Set by lender"
                        : scheme.interestRateMin?.toString() === "0" &&
                            scheme.interestRateMax?.toString() === "0"
                          ? "Lender rate + subsidy"
                          : `${scheme.interestRateMin?.toString() ?? scheme.interestRateMax?.toString()}%${scheme.interestRateMax && scheme.interestRateMax.toString() !== scheme.interestRateMin?.toString() ? `–${scheme.interestRateMax.toString()}%` : ""}`}
                    </p>
                  </div>
                </div>
                {scheme.sourceUrl && (
                  <a
                    className="mt-4 text-sm font-bold text-teal-700 hover:underline"
                    href={scheme.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  > <T>Official scheme source ↗</T> </a>
                )}
                {application && assessments.get(scheme.id) && <EligibilityExplanation assessment={assessments.get(scheme.id)!} applicationId={application.id} />}
                <TermSimplifier
                  text={`${scheme.name}. ${scheme.description}. Interest rate ${scheme.interestRateMin?.toString() ?? "not stated"} to ${scheme.interestRateMax?.toString() ?? "not stated"} percent.`}
                />
                {action && (
                  <form action={action} className="mt-5">
                    <button className="button-primary w-full" type="submit"> <T>Choose this scheme</T> </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination
          currentPage={paginated.currentPage}
          totalPages={paginated.totalPages}
          totalCount={paginated.totalCount}
          pageSize={paginated.pageSize}
        />
      </Suspense>
    </div>
  );
}
