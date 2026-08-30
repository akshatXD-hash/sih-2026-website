import { describe, expect, it } from "vitest";

import { filterAndPaginateSchemes, type SchemeCatalogItem } from "@/lib/scheme-catalogue";
import { loanSchemes } from "../../prisma/loan-schemes";

describe("filterAndPaginateSchemes", () => {
  const sampleItems: SchemeCatalogItem[] = loanSchemes.map((s, index) => ({
    scheme: {
      id: `scheme-${index}`,
      slug: s.slug,
      name: s.name,
      provider: s.provider,
      description: s.description,
      category: String(s.category),
      minAmount: Number(s.minAmount ?? 0),
      maxAmount: Number(s.maxAmount),
      minAnnualIncome: s.minAnnualIncome != null ? Number(s.minAnnualIncome) : null,
      maxAnnualIncome: s.maxAnnualIncome != null ? Number(s.maxAnnualIncome) : null,
      interestRateMin: s.interestRateMin != null ? Number(s.interestRateMin) : null,
      interestRateMax: s.interestRateMax != null ? Number(s.interestRateMax) : null,
      projectCategories: Array.isArray(s.projectCategories) ? (s.projectCategories as string[]) : [],
      eligibleTrades: Array.isArray(s.eligibleTrades) ? (s.eligibleTrades as string[]) : [],
      eligibleGenders: Array.isArray(s.eligibleGenders) ? (s.eligibleGenders as string[]) : [],
      eligibleApplicantTags: Array.isArray(s.eligibleApplicantTags) ? (s.eligibleApplicantTags as string[]) : [],
      sourceUrl: s.sourceUrl ?? null,
      isActive: true,
    },
  }));

  it("paginates items into pages with default pageSize = 8", () => {
    const result = filterAndPaginateSchemes(sampleItems, { page: 1, pageSize: 8 });
    expect(result.items.length).toBe(8);
    expect(result.totalCount).toBe(sampleItems.length);
    expect(result.totalPages).toBe(Math.ceil(sampleItems.length / 8));
    expect(result.currentPage).toBe(1);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.hasNextPage).toBe(true);
  });

  it("handles page 2 correctly", () => {
    const result = filterAndPaginateSchemes(sampleItems, { page: 2, pageSize: 8 });
    expect(result.items.length).toBe(8);
    expect(result.currentPage).toBe(2);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("clamps out-of-bound pages safely", () => {
    const resultOverflow = filterAndPaginateSchemes(sampleItems, { page: 999, pageSize: 8 });
    expect(resultOverflow.currentPage).toBe(resultOverflow.totalPages);
    expect(resultOverflow.hasNextPage).toBe(false);

    const resultUnderflow = filterAndPaginateSchemes(sampleItems, { page: -5, pageSize: 8 });
    expect(resultUnderflow.currentPage).toBe(1);
    expect(resultUnderflow.hasPreviousPage).toBe(false);
  });

  it("filters accurately by category", () => {
    const microResult = filterAndPaginateSchemes(sampleItems, {
      category: "MICRO_FINANCE",
      pageSize: 50,
    });
    expect(microResult.items.length).toBeGreaterThan(0);
    for (const item of microResult.items) {
      expect(item.scheme.category).toBe("MICRO_FINANCE");
    }
  });

  it("filters accurately by search keyword", () => {
    const searchResult = filterAndPaginateSchemes(sampleItems, {
      searchQuery: "MUDRA",
      pageSize: 50,
    });
    expect(searchResult.items.length).toBeGreaterThan(0);
    for (const item of searchResult.items) {
      const match =
        item.scheme.name.toLowerCase().includes("mudra") ||
        item.scheme.provider.toLowerCase().includes("mudra") ||
        item.scheme.description.toLowerCase().includes("mudra");
      expect(match).toBe(true);
    }
  });

  it("sorts by max amount descending", () => {
    const sorted = filterAndPaginateSchemes(sampleItems, {
      sortBy: "amount-desc",
      pageSize: 10,
    });
    const amounts = sorted.items.map((i) => Number(i.scheme.maxAmount));
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i + 1]);
    }
  });
});
