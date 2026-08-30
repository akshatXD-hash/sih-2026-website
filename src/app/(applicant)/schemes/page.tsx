import { notFound } from "next/navigation";

import { selectSchemeAction } from "@/app/(applicant)/actions";
import { RecommendationExplainer } from "@/components/ai/RecommendationExplainer";
import { TermSimplifier } from "@/components/ai/TermSimplifier";
import { Pagination } from "@/components/schemes/Pagination";
import { SchemeFilters } from "@/components/schemes/SchemeFilters";
import { requireApplicant } from "@/lib/auth/guards";
import { matchSchemes } from "@/lib/matching";
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
  }>;
}) {
  const user = await requireApplicant();
  const { applicationId, category, q, sort, page } = await searchParams;

  const schemes = await prisma.loanScheme.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const application = applicationId
    ? await prisma.application.findFirst({
        where: { id: applicationId, userId: user.id },
      })
    : null;

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

  const catalogItems: SchemeCatalogItem[] =
    matches.length > 0
      ? matches.map((match) => ({ scheme: match.scheme, match }))
      : schemes.map((scheme) => ({ scheme }));

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
      <span className="eyebrow">Scheme finder</span>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            {matches.length > 0
              ? `${matches.length} eligible matches`
              : "Available schemes"}
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

      <SchemeFilters hasMatches={matches.length > 0} />

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
              application && match
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
                    <p className="text-slate-500">Maximum</p>
                    <p className="font-bold text-slate-900">
                      {inr.format(Number(scheme.maxAmount.toString()))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Indicative rate</p>
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
                  >
                    Official scheme source ↗
                  </a>
                )}
                <TermSimplifier
                  text={`${scheme.name}. ${scheme.description}. Interest rate ${scheme.interestRateMin?.toString() ?? "not stated"} to ${scheme.interestRateMax?.toString() ?? "not stated"} percent.`}
                />
                {action && (
                  <form action={action} className="mt-5">
                    <button className="button-primary w-full" type="submit">
                      Choose this scheme
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={paginated.currentPage}
        totalPages={paginated.totalPages}
        totalCount={paginated.totalCount}
        pageSize={paginated.pageSize}
      />
    </div>
  );
}
