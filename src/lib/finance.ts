/** Pure EMI and moratorium calculations for the supported scheme range. */

export const MIN_ANNUAL_INTEREST_RATE = 6.5;
export const MAX_ANNUAL_INTEREST_RATE = 8;
export const MIN_FEMALE_REBATE = 0.5;
export const MAX_FEMALE_REBATE = 1;
export const MIN_MORATORIUM_MONTHS = 3;
export const MAX_MORATORIUM_MONTHS = 12;

export interface EMIInput {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  moratoriumMonths?: number;
  gender?: string | null;
  femaleInterestRebate?: number;
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
  appliedRebate: number;
  capitalizedInterest: number;
  totalInterest: number;
  totalPayable: number;
  schedule: ScheduleEntry[];
}

function assertFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${field} must be a finite number`);
  }
}

function validateInput(input: EMIInput): void {
  assertFinite(input.principal, "principal");
  assertFinite(input.annualInterestRate, "annualInterestRate");
  assertFinite(input.tenureMonths, "tenureMonths");

  if (input.principal <= 0) {
    throw new RangeError("principal must be greater than zero");
  }
  if (!Number.isInteger(input.tenureMonths) || input.tenureMonths <= 0) {
    throw new RangeError("tenureMonths must be a positive integer");
  }
  if (
    input.annualInterestRate < MIN_ANNUAL_INTEREST_RATE ||
    input.annualInterestRate > MAX_ANNUAL_INTEREST_RATE
  ) {
    throw new RangeError(
      `annualInterestRate must be between ${MIN_ANNUAL_INTEREST_RATE}% and ${MAX_ANNUAL_INTEREST_RATE}%`,
    );
  }

  const moratorium = input.moratoriumMonths ?? 0;
  if (
    !Number.isInteger(moratorium) ||
    (moratorium !== 0 &&
      (moratorium < MIN_MORATORIUM_MONTHS ||
        moratorium > MAX_MORATORIUM_MONTHS))
  ) {
    throw new RangeError(
      `moratoriumMonths must be 0 or between ${MIN_MORATORIUM_MONTHS} and ${MAX_MORATORIUM_MONTHS}`,
    );
  }
  if (moratorium >= input.tenureMonths) {
    throw new RangeError("moratoriumMonths must leave at least one repayment month");
  }

  const rebate = input.femaleInterestRebate ?? MIN_FEMALE_REBATE;
  assertFinite(rebate, "femaleInterestRebate");
  if (rebate < MIN_FEMALE_REBATE || rebate > MAX_FEMALE_REBATE) {
    throw new RangeError(
      `femaleInterestRebate must be between ${MIN_FEMALE_REBATE}% and ${MAX_FEMALE_REBATE}%`,
    );
  }
}

function computeEMI(principal: number, monthlyRate: number, months: number) {
  const factor = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Calculate EMI over a total tenure. Interest accrued during a grace period is
 * capitalized monthly, then the balance is amortized over the remaining term.
 */
export function calculateEMI(input: EMIInput): EMIResult {
  validateInput(input);

  const moratoriumMonths = input.moratoriumMonths ?? 0;
  const requestedRebate =
    input.femaleInterestRebate ?? MIN_FEMALE_REBATE;
  const appliedRebate = input.gender === "FEMALE" ? requestedRebate : 0;
  const effectiveInterestRate = input.annualInterestRate - appliedRebate;
  const monthlyRate = effectiveInterestRate / 12 / 100;
  const repaymentMonths = input.tenureMonths - moratoriumMonths;
  const schedule: ScheduleEntry[] = [];
  let balance = input.principal;
  let capitalizedInterest = 0;

  for (let month = 1; month <= moratoriumMonths; month += 1) {
    const interest = balance * monthlyRate;
    capitalizedInterest += interest;
    balance += interest;
    schedule.push({
      month,
      emi: 0,
      principalPaid: 0,
      interestPaid: 0,
      remainingBalance: round2(balance),
    });
  }

  const emi = computeEMI(balance, monthlyRate, repaymentMonths);
  let totalPaid = 0;

  for (
    let repaymentMonth = 1;
    repaymentMonth <= repaymentMonths;
    repaymentMonth += 1
  ) {
    const interest = balance * monthlyRate;
    const payment =
      repaymentMonth === repaymentMonths ? balance + interest : emi;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    totalPaid += payment;

    schedule.push({
      month: moratoriumMonths + repaymentMonth,
      emi: round2(payment),
      principalPaid: round2(principalPaid),
      interestPaid: round2(interest),
      remainingBalance: round2(balance),
    });
  }

  const totalPayable = round2(totalPaid);

  return {
    monthlyEMI: round2(emi),
    effectiveInterestRate: round2(effectiveInterestRate),
    appliedRebate: round2(appliedRebate),
    capitalizedInterest: round2(capitalizedInterest),
    totalInterest: round2(totalPayable - input.principal),
    totalPayable,
    schedule,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
