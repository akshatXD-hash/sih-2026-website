import { describe, expect, it } from "vitest";

import {
  calculateEMI,
  MAX_ANNUAL_INTEREST_RATE,
  MIN_ANNUAL_INTEREST_RATE,
} from "@/lib/finance";

describe("calculateEMI", () => {
  it("calculates EMI without double-counting principal", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 8,
      tenureMonths: 24,
    });

    expect(result.monthlyEMI).toBeCloseTo(4_522.73, 1);
    expect(result.totalPayable).toBeCloseTo(
      result.schedule.reduce((sum, entry) => sum + entry.emi, 0),
      1,
    );
    expect(result.totalPayable).toBeLessThan(110_000);
    expect(result.totalInterest).toBeCloseTo(
      result.totalPayable - 100_000,
      2,
    );
  });

  it("accepts both ends of the supported interest range", () => {
    expect(
      calculateEMI({
        principal: 100_000,
        annualInterestRate: MIN_ANNUAL_INTEREST_RATE,
        tenureMonths: 12,
      }).effectiveInterestRate,
    ).toBe(6.5);
    expect(
      calculateEMI({
        principal: 100_000,
        annualInterestRate: MAX_ANNUAL_INTEREST_RATE,
        tenureMonths: 12,
      }).effectiveInterestRate,
    ).toBe(8);
  });

  it("rejects rates outside 6.5% to 8.0%", () => {
    expect(() =>
      calculateEMI({
        principal: 100_000,
        annualInterestRate: 8.1,
        tenureMonths: 12,
      }),
    ).toThrow(/between 6.5% and 8%/);
  });

  it("applies a configurable 0.5% to 1% rebate only for women", () => {
    const female = calculateEMI({
      principal: 100_000,
      annualInterestRate: 8,
      tenureMonths: 24,
      gender: "FEMALE",
      femaleInterestRebate: 1,
    });
    const male = calculateEMI({
      principal: 100_000,
      annualInterestRate: 8,
      tenureMonths: 24,
      gender: "MALE",
      femaleInterestRebate: 1,
    });

    expect(female.appliedRebate).toBe(1);
    expect(female.effectiveInterestRate).toBe(7);
    expect(female.monthlyEMI).toBeLessThan(male.monthlyEMI);
    expect(male.appliedRebate).toBe(0);
  });

  it("uses the 0.5% rebate default for women", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 7,
      tenureMonths: 12,
      gender: "FEMALE",
    });

    expect(result.appliedRebate).toBe(0.5);
    expect(result.effectiveInterestRate).toBe(6.5);
  });

  it("rejects rebates outside the agreed range", () => {
    expect(() =>
      calculateEMI({
        principal: 100_000,
        annualInterestRate: 8,
        tenureMonths: 12,
        gender: "FEMALE",
        femaleInterestRebate: 1.1,
      }),
    ).toThrow(/between 0.5% and 1%/);
  });

  it("compounds interest during the moratorium before recalculating EMI", () => {
    const result = calculateEMI({
      principal: 100_000,
      annualInterestRate: 8,
      tenureMonths: 24,
      moratoriumMonths: 3,
    });
    const expectedBalance = 100_000 * (1 + 0.08 / 12) ** 3;

    expect(result.schedule).toHaveLength(24);
    expect(result.schedule.slice(0, 3).every((entry) => entry.emi === 0)).toBe(
      true,
    );
    expect(result.schedule[2].remainingBalance).toBeCloseTo(expectedBalance, 2);
    expect(result.capitalizedInterest).toBeCloseTo(
      expectedBalance - 100_000,
      2,
    );
    expect(result.schedule[23].remainingBalance).toBe(0);
  });

  it("increases the repayment EMI after a moratorium", () => {
    const base = calculateEMI({
      principal: 100_000,
      annualInterestRate: 8,
      tenureMonths: 24,
    });
    const deferred = calculateEMI({
      principal: 100_000,
      annualInterestRate: 8,
      tenureMonths: 24,
      moratoriumMonths: 3,
    });

    expect(deferred.monthlyEMI).toBeGreaterThan(base.monthlyEMI);
  });

  it("allows no moratorium or a grace period from 3 to 12 months", () => {
    expect(
      calculateEMI({
        principal: 100_000,
        annualInterestRate: 8,
        tenureMonths: 24,
        moratoriumMonths: 12,
      }).schedule,
    ).toHaveLength(24);
    expect(() =>
      calculateEMI({
        principal: 100_000,
        annualInterestRate: 8,
        tenureMonths: 24,
        moratoriumMonths: 2,
      }),
    ).toThrow(/must be 0 or between 3 and 12/);
  });

  it("requires at least one repayment month", () => {
    expect(() =>
      calculateEMI({
        principal: 100_000,
        annualInterestRate: 8,
        tenureMonths: 12,
        moratoriumMonths: 12,
      }),
    ).toThrow(/at least one repayment month/);
  });

  it("rejects invalid principal and tenure values", () => {
    expect(() =>
      calculateEMI({
        principal: 0,
        annualInterestRate: 8,
        tenureMonths: 12,
      }),
    ).toThrow(/greater than zero/);
    expect(() =>
      calculateEMI({
        principal: 100_000,
        annualInterestRate: 8,
        tenureMonths: 12.5,
      }),
    ).toThrow(/positive integer/);
  });
});
