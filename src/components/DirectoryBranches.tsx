"use client";
import { T } from "@/components/language/LanguageProvider";


import { useMemo, useState } from "react";
import type { ScoredBranch } from "@/lib/branch-ranking";
import { savePreferredBankAction } from "@/app/(applicant)/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { SchemeSupportBadge } from "@/components/SchemeSupportBadge";

const INITIAL_PAGE_SIZE = 8;
const PAGE_STEP = 10;

export function DirectoryBranches({
  branches,
  expanded,
  radiusKm,
  schemeName,
  confirmedOnly,
  lenderName,
  contactFallback,
  lenderSourceUrl,
  locatorUrl,
  applicationId,
  preferredBankId,
}: {
  applicationId?: string;
  preferredBankId?: string | null;
  branches: ScoredBranch[];
  expanded: boolean;
  radiusKm: number;
  schemeName?: string;
  confirmedOnly?: boolean;
  lenderName?: string;
  contactFallback?: boolean;
  lenderSourceUrl?: string;
  locatorUrl?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBranches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return branches;

    return branches.filter((branch) => {
      const name = (branch.name || "").toLowerCase();
      const address = (branch.addressLine || "").toLowerCase();
      const district = (branch.district || "").toLowerCase();
      const pincode = (branch.pincode || "").toLowerCase();
      const state = (branch.state || "").toLowerCase();
      return (
        name.includes(term) ||
        address.includes(term) ||
        district.includes(term) ||
        pincode.includes(term) ||
        state.includes(term)
      );
    });
  }, [branches, searchTerm]);

  const visibleBranches = useMemo(() => {
    return filteredBranches.slice(0, visibleCount);
  }, [filteredBranches, visibleCount]);

  const hasMore = visibleCount < filteredBranches.length;
  const isExpanded = visibleCount > INITIAL_PAGE_SIZE;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_STEP, filteredBranches.length));
  };

  const handleShowAll = () => {
    setVisibleCount(filteredBranches.length);
  };

  const handleShowLess = () => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  return (
    <section className="space-y-4" aria-label="Nearby bank directory">
      {contactFallback && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          No current branch-specific confirmations are recorded here for this scheme. The listings below are nearby{" "}
          {lenderName} contact options, not confirmed scheme matches.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {lenderName ? `Nearby ${lenderName} branches to contact` : "Nearby banks"} ({branches.length})
          </h2>
          <p className="text-xs text-slate-500">
            Closest mapped branches first. Contact the bank to confirm opening hours and support for your scheme.
          </p>
        </div>
      </div>

      {lenderSourceUrl && (
        <p className="text-sm text-slate-600">
          Bank identity matches the scheme lender; local processing must still be checked.{" "}
          <a className="text-blue-700 underline" href={lenderSourceUrl} target="_blank" rel="noopener noreferrer">
            Official loan information
          </a>{" "}
          ·{" "}
          <a className="text-blue-700 underline" href={locatorUrl} target="_blank" rel="noopener noreferrer">
            Official branch locator
          </a>
        </p>
      )}

      {expanded && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Few banks were mapped in your chosen radius. Showing the closest alternatives within {radiusKm} km, including
          those outside your radius.
        </p>
      )}

      {branches.length > 5 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(INITIAL_PAGE_SIZE);
              }}
              placeholder="Quick filter by bank name, PIN, area..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Filter nearby banks"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setVisibleCount(INITIAL_PAGE_SIZE);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                aria-label="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-slate-500">
              Found {filteredBranches.length} match{filteredBranches.length === 1 ? "" : "es"}
            </p>
          )}
        </div>
      )}

      {!branches.length && (
        <p className="panel text-sm text-slate-600">
          {confirmedOnly
            ? "No banks with current confirmation for this scheme were found in this area. Turn off the confirmed-only filter to see banks you can contact. This does not mean that no banks offer the scheme."
            : `No mapped banks found within ${radiusKm} km. Try a nearby town or a more precise location. Map coverage is incomplete.`}
        </p>
      )}

      {branches.length > 0 && filteredBranches.length === 0 && (
        <div className="panel text-center py-6 text-sm text-slate-600">
          No banks matched &quot;{searchTerm}&quot;.{" "}
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="text-blue-700 font-semibold underline ml-1"
          >
            Clear filter
          </button>
        </div>
      )}

      {visibleBranches.map((branch) => (
        <article key={branch.id} className="panel space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">{branch.name}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {[branch.addressLine, branch.district, branch.state, branch.pincode].filter(Boolean).join(", ") ||
                  "See the map pin for this bank's location."}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-900">
              {branch.distanceKm} km
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              className="font-semibold text-blue-700 underline"
              href={`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            > <T>Get directions</T> </a>
            {branch.phone && /^[+\d\s()-]{5,30}$/.test(branch.phone) && (
              <a
                className="font-semibold text-blue-700 underline"
                href={`tel:${branch.phone.replace(/[^+\d]/g, "")}`}
              >
                Call {branch.phone}
              </a>
            )}
            <a className="text-slate-600 underline" href={branch.directorySource?.url} target="_blank" rel="noopener noreferrer">
              Source map
            </a>
          </div>
          {schemeName && (
            <div>
              <p className="mb-1 text-xs font-bold">{schemeName}</p>
              <SchemeSupportBadge support={branch.schemeSupport} />
            </div>
          )}
          {applicationId && schemeName && branch.schemeSupport?.status !== "NOT_SUPPORTED" && (
            <div>
              {preferredBankId === branch.id ? (
                <p role="status" className="font-semibold text-teal-700">
                  ✓ Preferred branch saved
                </p>
              ) : (
                <form action={savePreferredBankAction.bind(null, applicationId, branch.id)}>
                  <SubmitButton pendingLabel="Saving branch…"><T>Choose as preferred branch</T></SubmitButton>
                </form>
              )}
              <p className="mt-2 text-xs text-slate-600">
                Saves your choice. A confirmed application partner is still needed for online submission.
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {schemeName ? "Support confirmation does not guarantee loan approval or funds." : "Select a scheme above to check branch support."}
          </p>
          <p className="text-xs text-slate-500">
            Mapped point: {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}. Confirm the exact branch using the
            source map or official locator.
          </p>
        </article>
      ))}

      {filteredBranches.length > INITIAL_PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row">
          <p className="text-xs font-medium text-slate-600">
            Showing <span className="font-bold text-slate-900">{visibleBranches.length}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredBranches.length}</span> banks
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasMore && (
              <>
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100"
                >
                  Show {Math.min(PAGE_STEP, filteredBranches.length - visibleCount)} more
                </button>
                <button
                  type="button"
                  onClick={handleShowAll}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
                >
                  Show all ({filteredBranches.length})
                </button>
              </>
            )}
            {isExpanded && (
              <button
                type="button"
                onClick={handleShowLess}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Collapse list
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Distances are straight-line distances. Road travel may be longer. Showing up to 60 closest mapped banks.
      </p>
    </section>
  );
}

