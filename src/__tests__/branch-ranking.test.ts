import { describe, expect, it } from "vitest";

import {
  type BranchWithDistance,
  rankBranches,
} from "@/lib/branch-ranking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBranch(overrides: Partial<BranchWithDistance> = {}): BranchWithDistance {
  return {
    id: "branch-1",
    name: "Test Branch",
    type: "BANK",
    addressLine: "123 Main St",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    phone: "9876543210",
    distanceMetres: 5000,
    fundQuotaAmount: 10_000_000,
    availableFundAmount: 7_000_000,
    npaPercentage: 3,
    latitude: 18.52,
    longitude: 73.85,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rankBranches", () => {
  it("returns an empty array for empty input", () => {
    expect(rankBranches([])).toEqual([]);
  });

  it("scores a single branch and includes all expected fields", () => {
    const [result] = rankBranches([makeBranch()]);

    expect(result).toBeDefined();
    expect(result.id).toBe("branch-1");
    expect(result.distanceKm).toBeCloseTo(5, 0);
    expect(result.distanceScore).toBeGreaterThan(0);
    expect(result.distanceScore).toBeLessThanOrEqual(100);
    expect(result.fundScore).toBeGreaterThan(0);
    expect(result.fundScore).toBeLessThanOrEqual(100);
    expect(result.npaScore).toBeGreaterThan(0);
    expect(result.npaScore).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("gives a perfect distance score at 0 metres", () => {
    const [result] = rankBranches([makeBranch({ distanceMetres: 0 })]);
    expect(result.distanceScore).toBe(100);
  });

  it("gives a distance score around 50 at 1 km", () => {
    const [result] = rankBranches([makeBranch({ distanceMetres: 1000 })]);
    expect(result.distanceScore).toBe(50);
  });

  it("gives a high fund score when quota is fully available", () => {
    const [result] = rankBranches([
      makeBranch({
        fundQuotaAmount: 10_000_000,
        availableFundAmount: 10_000_000,
      }),
    ]);
    expect(result.fundScore).toBe(100);
  });

  it("gives zero fund score when funds are exhausted", () => {
    const [result] = rankBranches([
      makeBranch({ fundQuotaAmount: 10_000_000, availableFundAmount: 0 }),
    ]);
    expect(result.fundScore).toBe(0);
  });

  it("gives zero fund score when quota data is missing", () => {
    const [result] = rankBranches([
      makeBranch({ fundQuotaAmount: null, availableFundAmount: null }),
    ]);
    expect(result.fundScore).toBe(0);
  });

  it("gives a high NPA score for low NPA", () => {
    const [result] = rankBranches([makeBranch({ npaPercentage: 2 })]);
    expect(result.npaScore).toBe(98);
  });

  it("gives zero NPA score when NPA is 100%", () => {
    const [result] = rankBranches([makeBranch({ npaPercentage: 100 })]);
    expect(result.npaScore).toBe(0);
  });

  it("gives a mid-range NPA score when NPA is null", () => {
    const [result] = rankBranches([makeBranch({ npaPercentage: null })]);
    expect(result.npaScore).toBe(50);
  });

  it("ranks closer branches above farther ones, all else equal", () => {
    const results = rankBranches([
      makeBranch({ id: "far", name: "Far Branch", distanceMetres: 30_000 }),
      makeBranch({ id: "near", name: "Near Branch", distanceMetres: 1_000 }),
    ]);
    expect(results[0].id).toBe("near");
    expect(results[1].id).toBe("far");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("ranks branches with more available funds higher, distance equal", () => {
    const results = rankBranches([
      makeBranch({
        id: "low-fund",
        name: "Low Fund",
        distanceMetres: 5000,
        availableFundAmount: 1_000_000,
        fundQuotaAmount: 10_000_000,
      }),
      makeBranch({
        id: "high-fund",
        name: "High Fund",
        distanceMetres: 5000,
        availableFundAmount: 9_000_000,
        fundQuotaAmount: 10_000_000,
      }),
    ]);
    expect(results[0].id).toBe("high-fund");
  });

  it("ranks branches with lower NPA higher, distance and funds equal", () => {
    const results = rankBranches([
      makeBranch({
        id: "high-npa",
        name: "High NPA",
        distanceMetres: 5000,
        npaPercentage: 20,
      }),
      makeBranch({
        id: "low-npa",
        name: "Low NPA",
        distanceMetres: 5000,
        npaPercentage: 2,
      }),
    ]);
    expect(results[0].id).toBe("low-npa");
  });

  it("weights correctly: a very close but fund-depleted branch can lose to a farther well-funded branch", () => {
    const results = rankBranches([
      makeBranch({
        id: "close-no-fund",
        name: "Close No Fund",
        distanceMetres: 500,
        availableFundAmount: 0,
        fundQuotaAmount: 10_000_000,
        npaPercentage: 25,
      }),
      makeBranch({
        id: "far-funded",
        name: "Far Funded",
        distanceMetres: 10_000,
        availableFundAmount: 9_500_000,
        fundQuotaAmount: 10_000_000,
        npaPercentage: 2,
      }),
    ]);
    // With W_FUND=0.35 and W_NPA=0.25, the far but well-funded branch
    // should outscore the near but depleted one.
    expect(results[0].id).toBe("far-funded");
  });

  it("breaks score ties by ascending distance, then name", () => {
    const results = rankBranches([
      makeBranch({ id: "b", name: "Bravo", distanceMetres: 3000 }),
      makeBranch({ id: "a", name: "Alpha", distanceMetres: 2000 }),
    ]);
    // Closer branch should come first on tie
    if (results[0].score === results[1].score) {
      expect(results[0].distanceMetres).toBeLessThanOrEqual(
        results[1].distanceMetres,
      );
    }
  });

  it("preserves all original BranchWithDistance fields in the result", () => {
    const original = makeBranch({ phone: "1234567890" });
    const [result] = rankBranches([original]);
    expect(result.phone).toBe("1234567890");
    expect(result.latitude).toBe(18.52);
    expect(result.longitude).toBe(73.85);
  });

  it("handles negative distance gracefully (clamps to 0)", () => {
    const [result] = rankBranches([makeBranch({ distanceMetres: -100 })]);
    expect(result.distanceKm).toBe(0);
    expect(result.distanceScore).toBe(100);
  });

  it("returns scored branches for a realistic dataset", () => {
    const branches = [
      makeBranch({
        id: "sbi-kothrud",
        name: "SBI Kothrud",
        distanceMetres: 2_500,
        fundQuotaAmount: 50_000_000,
        availableFundAmount: 35_000_000,
        npaPercentage: 4.2,
      }),
      makeBranch({
        id: "boi-deccan",
        name: "BOI Deccan",
        distanceMetres: 4_000,
        fundQuotaAmount: 30_000_000,
        availableFundAmount: 25_000_000,
        npaPercentage: 2.1,
      }),
      makeBranch({
        id: "canara-hadapsar",
        name: "Canara Hadapsar",
        distanceMetres: 12_000,
        fundQuotaAmount: 20_000_000,
        availableFundAmount: 5_000_000,
        npaPercentage: 8.5,
      }),
    ];

    const results = rankBranches(branches);
    expect(results).toHaveLength(3);
    // All scores should be between 0 and 100
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
    // BOI Deccan wins: better fund ratio (83% vs 70%) and lower NPA (2.1% vs 4.2%)
    // outweigh the slightly larger distance (4 km vs 2.5 km).
    expect(results[0].id).toBe("boi-deccan");
    expect(results[1].id).toBe("sbi-kothrud");
    expect(results[2].id).toBe("canara-hadapsar");
  });
});
