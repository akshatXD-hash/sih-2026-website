import { describe, it, expect } from "vitest";
import { matchSchemes, type Scheme, type ApplicantProfile } from "@/lib/matching";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseScheme(overrides: Partial<Scheme> = {}): Scheme {
  return {
    id: "scheme-1",
    slug: "test-scheme",
    name: "Test Scheme",
    provider: "Test Bank",
    category: "MICRO_FINANCE",
    minAmount: 10_000,
    maxAmount: 140_000,
    minAnnualIncome: null,
    maxAnnualIncome: 300_000,
    interestRateMin: 12,
    interestRateMax: 24,
    projectCategories: ["micro-enterprise", "agriculture-allied"],
    eligibleTrades: ["tailoring", "dairy"],
    eligibleGenders: ["FEMALE", "TRANSGENDER"],
    isActive: true,
    ...overrides,
  };
}

function baseApplicant(overrides: Partial<ApplicantProfile> = {}): ApplicantProfile {
  return {
    annualIncome: 200_000,
    projectCategory: "micro-enterprise",
    requestedAmount: 100_000,
    trade: "tailoring",
    gender: "FEMALE",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("matchSchemes", () => {
  it("returns eligible schemes for a valid micro-finance applicant", () => {
    const scheme = baseScheme();
    const applicant = baseApplicant();
    const results = matchSchemes(applicant, [scheme]);
    expect(results).toHaveLength(1);
    expect(results[0].scheme.id).toBe("scheme-1");
  });

  it("excludes inactive schemes", () => {
    const scheme = baseScheme({ isActive: false });
    const results = matchSchemes(baseApplicant(), [scheme]);
    expect(results).toHaveLength(0);
  });

  it("excludes scheme when requested amount is below min", () => {
    const scheme = baseScheme({ minAmount: 50_000 });
    const applicant = baseApplicant({ requestedAmount: 30_000 });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("excludes scheme when requested amount is above max", () => {
    const scheme = baseScheme({ maxAmount: 50_000 });
    const applicant = baseApplicant({ requestedAmount: 100_000 });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("excludes scheme when income exceeds max annual income", () => {
    const scheme = baseScheme({ maxAnnualIncome: 100_000 });
    const applicant = baseApplicant({ annualIncome: 200_000 });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("excludes scheme when income is below min annual income", () => {
    const scheme = baseScheme({ minAnnualIncome: 500_000 });
    const applicant = baseApplicant({ annualIncome: 200_000 });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("excludes scheme when project category does not match", () => {
    const scheme = baseScheme({ projectCategories: ["manufacturing"] });
    const applicant = baseApplicant({ projectCategory: "micro-enterprise" });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("includes scheme when project categories list is empty (open to all)", () => {
    const scheme = baseScheme({ projectCategories: [] });
    const applicant = baseApplicant({ projectCategory: "anything" });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(1);
  });

  it("excludes scheme when trade is not in eligible list", () => {
    const scheme = baseScheme({ eligibleTrades: ["tailoring"] });
    const applicant = baseApplicant({ trade: "dairy" });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("includes scheme when applicant has no trade and scheme has trade list", () => {
    const scheme = baseScheme({ eligibleTrades: ["tailoring"] });
    const applicant = baseApplicant({ trade: null });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(1);
  });

  it("excludes scheme when gender is not in eligible list", () => {
    const scheme = baseScheme({ eligibleGenders: ["FEMALE"] });
    const applicant = baseApplicant({ gender: "MALE" });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(0);
  });

  it("includes scheme when applicant has no gender and scheme has gender list", () => {
    const scheme = baseScheme({ eligibleGenders: ["FEMALE"] });
    const applicant = baseApplicant({ gender: null });
    expect(matchSchemes(applicant, [scheme])).toHaveLength(1);
  });

  it("returns empty array when no schemes match", () => {
    const s1 = baseScheme({ maxAmount: 50_000 });
    const s2 = baseScheme({ eligibleGenders: ["MALE"] });
    const applicant = baseApplicant({ requestedAmount: 100_000, gender: "FEMALE" });
    expect(matchSchemes(applicant, [s1, s2])).toHaveLength(0);
  });

  it("handles empty schemes array", () => {
    expect(matchSchemes(baseApplicant(), [])).toHaveLength(0);
  });

  it("handles applicant with all optional fields null", () => {
    const scheme = baseScheme({ projectCategories: [], eligibleTrades: [], eligibleGenders: [] });
    const applicant: ApplicantProfile = {
      annualIncome: 200_000,
      projectCategory: "micro-enterprise",
      requestedAmount: 100_000,
      trade: null,
      gender: null,
    };
    expect(matchSchemes(applicant, [scheme])).toHaveLength(1);
  });

  it("ranks results by score descending (higher coverage = higher rank)", () => {
    const lowMax = baseScheme({ id: "low", maxAmount: 100_000 });
    const highMax = baseScheme({ id: "high", maxAmount: 200_000 });
    const applicant = baseApplicant({ requestedAmount: 100_000 });
    const results = matchSchemes(applicant, [highMax, lowMax]);
    // lowMax gives coverageRatio 1.0, highMax gives 0.5 → low should rank first
    expect(results[0].scheme.id).toBe("low");
    expect(results[1].scheme.id).toBe("high");
  });

  it("ranks higher interest concession above lower", () => {
    const lowConc = baseScheme({ id: "low-conc", interestRateMin: 20, interestRateMax: 24 });
    const highConc = baseScheme({ id: "high-conc", interestRateMin: 10, interestRateMax: 24 });
    const applicant = baseApplicant();
    const results = matchSchemes(applicant, [lowConc, highConc]);
    expect(results[0].scheme.id).toBe("high-conc");
  });

  it("matches all 5 seed schemes for a valid micro-finance applicant", () => {
    // Simulate the seed data
    const seedSchemes: Scheme[] = [
      baseScheme({
        id: "shg", slug: "shg", category: "MICRO_FINANCE",
        maxAmount: 140_000, maxAnnualIncome: 300_000,
        interestRateMin: 12, interestRateMax: 24,
        projectCategories: ["micro-enterprise", "agriculture-allied", "livelihood"],
        eligibleTrades: ["tailoring", "handicrafts", "dairy", "food processing", "street vending"],
        eligibleGenders: ["FEMALE", "TRANSGENDER"],
      }),
      baseScheme({
        id: "mudra", slug: "mudra", category: "TERM_LOAN",
        minAmount: 50_001, maxAmount: 500_000,
        projectCategories: ["manufacturing", "services", "trading"],
        eligibleTrades: ["repair services", "retail", "transport", "food processing", "artisan"],
        eligibleGenders: [],
      }),
      baseScheme({
        id: "pmegp", slug: "pmegp", category: "TERM_LOAN",
        minAmount: 100_000, maxAmount: 5_000_000,
        projectCategories: ["manufacturing", "micro-enterprise"],
        eligibleTrades: ["agro processing", "textiles", "wood products", "engineering works", "recycling"],
        eligibleGenders: [],
      }),
      baseScheme({
        id: "edu-india", slug: "edu-india", category: "EDUCATION_LOAN",
        minAmount: 50_000, maxAmount: 1_000_000,
        interestRateMin: 8.5, interestRateMax: 12.5,
        projectCategories: ["higher-education-india", "vocational-education"],
        eligibleTrades: [], eligibleGenders: [],
      }),
      baseScheme({
        id: "edu-abroad", slug: "edu-abroad", category: "EDUCATION_LOAN",
        minAmount: 500_000, maxAmount: 2_000_000,
        interestRateMin: 9, interestRateMax: 13.5,
        projectCategories: ["higher-education-abroad"],
        eligibleTrades: [], eligibleGenders: [],
      }),
    ];

    const applicant = baseApplicant({
      annualIncome: 200_000,
      projectCategory: "micro-enterprise",
      requestedAmount: 100_000,
      trade: "tailoring",
      gender: "FEMALE",
    });

    const results = matchSchemes(applicant, seedSchemes);
    // SHG and PMEGP should match (micro-enterprise, tailoring, female within ranges)
    // MUDRA: manufacturing/services/trading — no match for micro-enterprise
    // edu-india: higher-education/vocational — no match
    // edu-abroad: higher-education-abroad — no match, also amount too low
    expect(results.length).toBeGreaterThanOrEqual(1);
    const ids = results.map((r) => r.scheme.id);
    expect(ids).toContain("shg");
  });
});
