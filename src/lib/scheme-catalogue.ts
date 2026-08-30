import type { MatchResult, NumericValue, Scheme } from "@/lib/matching";

export interface SchemeCatalogItem {
  scheme: Scheme;
  match?: MatchResult;
}

export type SchemeSortOption =
  | "fit"
  | "name-asc"
  | "name-desc"
  | "amount-desc"
  | "amount-asc"
  | "rate-asc";

export interface FilterSchemeOptions {
  category?: string;
  searchQuery?: string;
  sortBy?: SchemeSortOption;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

function parseNumber(value?: NumericValue | null): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return 0;
}

export function filterAndPaginateSchemes(
  items: SchemeCatalogItem[],
  options: FilterSchemeOptions = {},
): PaginatedResult<SchemeCatalogItem> {
  const {
    category,
    searchQuery,
    sortBy = items.some((i) => i.match != null) ? "fit" : "name-asc",
    page = 1,
    pageSize = 8,
  } = options;

  let filtered = [...items];

  if (category && category !== "ALL") {
    const normalizedCategory = category.toUpperCase().trim();
    filtered = filtered.filter(
      (item) => item.scheme.category.toUpperCase() === normalizedCategory,
    );
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      const s = item.scheme;
      return (
        s.name.toLowerCase().includes(q) ||
        s.provider.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.projectCategories?.some((cat) => cat.toLowerCase().includes(q)) ||
        s.eligibleTrades?.some((trade) => trade.toLowerCase().includes(q)) ||
        s.eligibleApplicantTags?.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "fit": {
        const scoreA = a.match?.rankScore ?? 0;
        const scoreB = b.match?.rankScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.scheme.name.localeCompare(b.scheme.name);
      }
      case "name-desc":
        return b.scheme.name.localeCompare(a.scheme.name);
      case "amount-desc": {
        const maxA = parseNumber(a.scheme.maxAmount);
        const maxB = parseNumber(b.scheme.maxAmount);
        if (maxB !== maxA) return maxB - maxA;
        return a.scheme.name.localeCompare(b.scheme.name);
      }
      case "amount-asc": {
        const maxA = parseNumber(a.scheme.maxAmount);
        const maxB = parseNumber(b.scheme.maxAmount);
        if (maxA !== maxB) return maxA - maxB;
        return a.scheme.name.localeCompare(b.scheme.name);
      }
      case "rate-asc": {
        const rateA = parseNumber(a.scheme.interestRateMin ?? a.scheme.interestRateMax ?? 999);
        const rateB = parseNumber(b.scheme.interestRateMin ?? b.scheme.interestRateMax ?? 999);
        if (rateA !== rateB) return rateA - rateB;
        return a.scheme.name.localeCompare(b.scheme.name);
      }
      case "name-asc":
      default:
        return a.scheme.name.localeCompare(b.scheme.name);
    }
  });
  const totalCount = filtered.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * safePageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + safePageSize);

  return {
    items: paginatedItems,
    totalCount,
    totalPages,
    currentPage,
    pageSize: safePageSize,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}