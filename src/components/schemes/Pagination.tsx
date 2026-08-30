"use client";

import { usePathname, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalCount === 0 || totalPages <= 1) {
    return null;
  }

  function getPageUrl(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (currentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Schemes pagination"
      className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-black/10 pt-6 sm:flex-row"
    >
      <p className="text-xs font-bold text-slate-500">
        Showing <span className="text-slate-900">{startItem}</span>–
        <span className="text-slate-900">{endItem}</span> of{" "}
        <span className="text-slate-900">{totalCount}</span> schemes
      </p>

      <div className="flex items-center gap-1.5">
        {currentPage > 1 ? (
          <a
            href={getPageUrl(currentPage - 1)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-black/20 bg-white px-3 text-xs font-bold text-slate-800 hover:border-black hover:bg-slate-50"
            aria-label="Go to previous page"
          >
            ← Prev
          </a>
        ) : (
          <span
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-400 cursor-not-allowed"
            aria-disabled="true"
          >
            ← Prev
          </span>
        )}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs font-bold text-slate-400"
                >
                  …
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return isCurrent ? (
              <span
                key={p}
                aria-current="page"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black text-xs font-black text-white"
              >
                {p}
              </span>
            ) : (
              <a
                key={p}
                href={getPageUrl(p)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/15 bg-white text-xs font-bold text-slate-800 hover:border-black hover:bg-slate-50"
              >
                {p}
              </a>
            );
          })}
        </div>
        {currentPage < totalPages ? (
          <a
            href={getPageUrl(currentPage + 1)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-black/20 bg-white px-3 text-xs font-bold text-slate-800 hover:border-black hover:bg-slate-50"
            aria-label="Go to next page"
          >
            Next →
          </a>
        ) : (
          <span
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-400 cursor-not-allowed"
            aria-disabled="true"
          >
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}