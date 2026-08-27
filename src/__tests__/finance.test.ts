import { describe, it, expect } from "vitest";
import { calculateEMI } from "@/lib/finance";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("calculateEMI", () => {
  // ---- Basic EMI ----

  it("calculates basic EMI correctly", () => {
    // ₹100,000 at 12% p.a. for 24 months → ~₹4,707
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
    });
    expect(result.monthlyEMI).toBeCloseTo(4_707.35, 0);
    expect(result.effectiveInterestRate).toBe(12);
  });

  it("matches a known online calculator value for ₹5,00,000 at 10% for 60 months", () => {
    const result = calculateEMI({
      principal: 500_000,
      annualInterestRate: 10,
      tenureMonths: 60,
    });
    expect(result.monthlyEMI).toBeCloseTo(10_623.51, 0);
  });

  // ---- Gender rebate ----

  it("applies 1pp rebate for FEMALE", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
      gender: "FEMALE",
    });
    expect(result.effectiveInterestRate).toBe(11);
    // EMI should be slightly lower than non-rebate
    const noRebate = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
      gender: "MALE",
    });
    expect(result.monthlyEMI).toBeLessThan(noRebate.monthlyEMI);
  });

  it("applies 1pp rebate for TRANSGENDER", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
      gender: "TRANSGENDER",
    });
    expect(result.effectiveInterestRate).toBe(11);
  });

  it("does not apply rebate for MALE", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
      gender: "MALE",
    });
    expect(result.effectiveInterestRate).toBe(12);
  });

  it("does not apply rebate for null/undefined gender", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
    });
    expect(result.effectiveInterestRate).toBe(12);
  });

  // ---- Moratorium ----

  it("with moratorium=0 gives same EMI as no moratorium", () => {
    const a = calculateEMI({ principal: 100_000, annualInterestRate: 12, tenureMonths: 24 });
    const b = calculateEMI({ principal: 100_000, annualInterestRate: 12, tenureMonths: 24, moratoriumMonths: 0 });
    expect(b.monthlyEMI).toBe(a.monthlyEMI);
    expect(b.schedule).toHaveLength(24);
  });

  it("moratorium months show zero EMI with interest accrual", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
      moratoriumMonths: 3,
    });
    // First 3 months should have 0 EMI
    expect(result.schedule[0].emi).toBe(0);
    expect(result.schedule[1].emi).toBe(0);
    expect(result.schedule[2].emi).toBe(0);
    // Month 4 should have a non-zero EMI
    expect(result.schedule[3].emi).toBeGreaterThan(0);
    // Total schedule length = 24
    expect(result.schedule).toHaveLength(24);
  });

  it("moratorium inflates principal and increases post-moratorium EMI", () => {
    const noMorat = calculateEMI({ principal: 100_000, annualInterestRate: 12, tenureMonths: 24 });
    const withMorat = calculateEMI({ principal: 100_000, annualInterestRate: 12, tenureMonths: 24, moratoriumMonths: 3 });
    // Post-moratorium EMI should be higher because principal accrued interest
    expect(withMorat.schedule[3].emi).toBeGreaterThan(noMorat.monthlyEMI);
  });

  it("moratorium = tenure (edge: all interest accrues, no repayment months)", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 6,
      moratoriumMonths: 6,
    });
    expect(result.monthlyEMI).toBe(0);
    expect(result.schedule).toHaveLength(6);
    expect(result.totalPayable).toBe(0);
    // Balance after 6 months of interest accrual
    const expectedBalance = 100_000 * Math.pow(1 + 0.12 / 12, 6);
    expect(result.schedule[5].remainingBalance).toBeCloseTo(expectedBalance, 0);
  });

  // ---- Schedule validation ----

  it("schedule length equals tenureMonths", () => {
    const result = calculateEMI({
      principal: 200_000,
      annualInterestRate: 10,
      tenureMonths: 36,
      moratoriumMonths: 3,
    });
    expect(result.schedule).toHaveLength(36);
  });

  it("remaining balance approaches zero after all repayments", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 12,
    });
    const lastEntry = result.schedule[result.schedule.length - 1];
    expect(lastEntry.remainingBalance).toBeCloseTo(0, 0);
  });

  it("sum of principal payments equals inflated principal", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 24,
      moratoriumMonths: 3,
    });
    const totalPrincipalPaid = result.schedule
      .filter((e) => e.principalPaid > 0)
      .reduce((sum, e) => sum + e.principalPaid, 0);
    // Moratorium uses simple interest: principal + principal × monthlyRate × months
    // Small rounding tolerance across 21 monthly entries
    const inflatedPrincipal = 100_000 + 100_000 * (0.12 / 12) * 3;
    expect(totalPrincipalPaid).toBeGreaterThanOrEqual(inflatedPrincipal - 10);
    expect(totalPrincipalPaid).toBeLessThanOrEqual(inflatedPrincipal + 10);
  });

  // ---- Edge cases ----

  it("0% interest returns principal / tenure as EMI", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 0,
      tenureMonths: 10,
    });
    expect(result.monthlyEMI).toBe(10_000);
    expect(result.effectiveInterestRate).toBe(0);
    // All principal paid, zero interest
    const totalInterest = result.schedule.reduce((s, e) => s + e.interestPaid, 0);
    expect(totalInterest).toBe(0);
  });

  it("1-month tenure calculates correctly", () => {
    const result = calculateEMI({
      principal: 50_000,
      annualInterestRate: 12,
      tenureMonths: 1,
    });
    // 1 month: interest = 50000 * 0.01 = 500, EMI = 50500
    expect(result.monthlyEMI).toBe(50_500);
    expect(result.schedule).toHaveLength(1);
    expect(result.schedule[0].remainingBalance).toBe(0);
  });

  it("totalPayable reflects total outflow (principal + interest)", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 12,
      tenureMonths: 12,
    });
    // totalPayable = 12 × EMI + principal (for the total borrower outflow)
    expect(result.totalPayable).toBeCloseTo(12 * result.monthlyEMI + 100_000, 0);
  });
});
