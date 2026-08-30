import { describe, expect, it } from "vitest";

import { loanSchemes } from "../../prisma/loan-schemes";

describe("loan scheme catalogue", () => {
  it("contains at least 50 independently identifiable entries", () => {
    expect(loanSchemes.length).toBeGreaterThanOrEqual(50);
    expect(new Set(loanSchemes.map((scheme) => scheme.slug)).size).toBe(loanSchemes.length);
  });

  it("keeps every amount range and age range internally valid", () => {
    for (const scheme of loanSchemes) {
      expect(Number(scheme.maxAmount), scheme.slug).toBeGreaterThan(0);
      expect(Number(scheme.minAmount ?? 0), scheme.slug).toBeLessThanOrEqual(Number(scheme.maxAmount));
      if (scheme.minAge != null && scheme.maxAge != null) {
        expect(scheme.minAge, scheme.slug).toBeLessThanOrEqual(scheme.maxAge);
      }
    }
  });

  it("links every entry to a verified HTTPS source", () => {
    for (const scheme of loanSchemes) {
      expect(scheme.sourceUrl, scheme.slug).toMatch(/^https:\/\//);
      expect(scheme.sourceVerifiedAt, scheme.slug).toBeInstanceOf(Date);
    }
  });
});
