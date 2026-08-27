/**
 * EMI calculator with gender rebate and moratorium support.
 *
 * Pure function — no database, UI, or external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EMIInput {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  moratoriumMonths?: number;
  gender?: string | null;
}

export interface ScheduleEntry {
  month: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface EMIResult {
  monthlyEMI: number;
  effectiveInterestRate: number;
  totalPayable: number;
  schedule: ScheduleEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FEMALE_REBATE_PP = 1.0; // percentage points off for female / transgender

function applyRebate(annualRate: number, gender?: string | null): number {
  if (gender === "FEMALE" || gender === "TRANSGENDER") {
    return Math.max(0, annualRate - FEMALE_REBATE_PP);
  }
  return annualRate;
}

/**
 * Standard EMI: P × r × (1+r)^n / ((1+r)^n − 1)
 */
function computeEMI(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return 0;
  if (monthlyRate === 0) return principal / months;

  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate EMI, apply moratorium, and generate a full amortization schedule.
 */
export function calculateEMI(input: EMIInput): EMIResult {
  const { principal, tenureMonths, moratoriumMonths = 0 } = input;
  const effectiveRate = applyRebate(input.annualInterestRate, input.gender);
  const monthlyRate = effectiveRate / 12 / 100;

  const repaymentMonths = tenureMonths - moratoriumMonths;

  // During moratorium interest accrues on the principal
  const moratoriumAccrued = principal * monthlyRate * moratoriumMonths;
  const inflatedPrincipal = principal + moratoriumAccrued;

  const emi =
    repaymentMonths > 0
      ? computeEMI(inflatedPrincipal, monthlyRate, repaymentMonths)
      : 0;

  // Build full schedule: moratorium months (0 EMI) + repayment months
  const schedule: ScheduleEntry[] = [];
  let balance = principal;
  let totalPaid = 0;

  // Moratorium months — interest accrues, no EMI
  for (let m = 1; m <= moratoriumMonths; m++) {
    const interest = balance * monthlyRate;
    balance += interest;
    schedule.push({
      month: m,
      emi: 0,
      principalPaid: 0,
      interestPaid: 0,
      remainingBalance: round2(balance),
    });
  }

  // Repayment months
  for (let m = 1; m <= repaymentMonths; m++) {
    const interest = balance * monthlyRate;
    const principalPart = emi - interest;
    balance -= principalPart;
    totalPaid += emi;

    schedule.push({
      month: moratoriumMonths + m,
      emi: round2(emi),
      principalPaid: round2(principalPart),
      interestPaid: round2(interest),
      remainingBalance: round2(Math.max(0, balance)),
    });
  }

  // If no repayment months, total is 0 (edge: moratorium = tenure)
  const totalPayable =
    repaymentMonths > 0
      ? round2(totalPaid + principal) // totalPaid = EMIs only, add principal for full outflow
      : 0;

  return {
    monthlyEMI: round2(emi),
    effectiveInterestRate: effectiveRate,
    totalPayable,
    schedule,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
