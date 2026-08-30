"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const CATEGORIES = [
  { value: "ALL", label: "All Schemes" },
  { value: "MICRO_FINANCE", label: "Micro Finance" },
  { value: "TERM_LOAN", label: "Term Loan" },
  { value: "EDUCATION_LOAN", label: "Education Loan" },
];

interface SchemeFiltersProps {
  hasMatches?: boolean;
}

export function SchemeFilters({ hasMatches = false }: SchemeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCategory = searchParams.get("category")?.toUpperCase() || "ALL";
  const currentSearch = searchParams.get("q") || "";
  const currentSort = searchParams.get("sort") || (hasMatches ? "fit" : "name-asc");

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    
    // Always reset page to 1 when changing filters
    if (!updates.page) {
      params.delete("page");
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "" || (key === "category" && value === "ALL")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasActiveFilters =
    (currentCategory !== "ALL") ||
    Boolean(currentSearch.trim()) ||
    (currentSort !== (hasMatches ? "fit" : "name-asc"));

  return (
    <div className="panel mt-6 space-y-5 border-black/15 bg-white/70 backdrop-blur-sm">
      {/* Top row: Category Pills & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Scheme categories">
          {CATEGORIES.map((cat) => {
            const isSelected = currentCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => updateQuery({ category: cat.value })}
                className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                  isSelected
                    ? "bg-black text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="scheme-sort" className="text-xs font-bold text-slate-600 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="scheme-sort"
            value={currentSort}
            onChange={(e) => updateQuery({ sort: e.target.value })}
            className="rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-black"
          >
            {hasMatches && <option value="fit">Best match (Fit Score)</option>}
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="amount-desc">Max Amount (High → Low)</option>
            <option value="amount-asc">Max Amount (Low → High)</option>
            <option value="rate-asc">Interest Rate (Lowest first)</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Search input + Clear Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="search"
            defaultValue={currentSearch}
            placeholder="Search schemes by name, provider, keyword or eligible trade..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateQuery({ q: e.currentTarget.value });
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== currentSearch) {
                updateQuery({ q: e.target.value });
              }
            }}
            className="w-full rounded-xl border border-black/20 bg-white pl-4 pr-28 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-black focus:outline-none"
            aria-label="Search schemes"
          />
          {isPending && (
            <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700 animate-pulse">
              Searching...
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              updateQuery({
                category: null,
                q: null,
                sort: null,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-black"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
