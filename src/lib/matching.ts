/** Pure, deterministic eligibility and scheme-ranking logic. */

export type NumericValue = number | string | { toNumber(): number };

export interface ApplicantProfile {
  annualIncome: NumericValue;
  projectCategory: string;
  requestedAmount: NumericValue;
  trade?: string | null;
  gender?: string | null;
  age?: number | null;
  applicantTags?: string[];
}

/**
 * Minimal LoanScheme projection used by the matcher. Prisma Decimal values are
 * accepted directly, so callers do not have to reshape database records.
 */
export interface Scheme {
  id: string;
  slug: string;
  name: string;
  provider: string;
  description: string;
  category: string;
  minAmount: NumericValue;
  maxAmount: NumericValue;
  minAnnualIncome?: NumericValue | null;
  maxAnnualIncome?: NumericValue | null;
  interestRateMin?: NumericValue | null;
  interestRateMax?: NumericValue | null;
  projectCategories: string[];
  eligibleTrades: string[];
  eligibleGenders: string[];
  minAge?: number | null;
  maxAge?: number | null;
  eligibleApplicantTags: string[];
  sourceUrl?: string | null;
  isActive: boolean;
}

export interface MatchResult {
  scheme: Scheme;
  /** How much of the scheme ceiling the requested amount uses, from 0 to 100. */
  coveragePercentage: number;
  /** Difference between the scheme's maximum and minimum offered rates. */
  interestConcession: number;
  /** Weighted score from 0 to 100. */
  rankScore: number;
}

interface RankedCandidate {
  scheme: Scheme;
  coveragePercentage: number;
  interestConcession: number;
  lowestInterestRate: number;
}

function toNumber(value: NumericValue, field: string): number {
  const numeric =
    typeof value === "object" ? value.toNumber() : Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new RangeError(`${field} must be a finite, non-negative number`);
  }

  return numeric;
}

function canonical(value: string): string {
  return value.trim().toLocaleLowerCase("en-IN");
}

function includesCanonical(values: string[], value: string): boolean {
  const candidate = canonical(value);
  return values.some((item) => canonical(item) === candidate);
}

function isEligible(applicant: ApplicantProfile, scheme: Scheme): boolean {
  if (!scheme.isActive) return false;

  const requestedAmount = toNumber(
    applicant.requestedAmount,
    "requestedAmount",
  );
  const annualIncome = toNumber(applicant.annualIncome, "annualIncome");
  const minAmount = toNumber(scheme.minAmount, "scheme.minAmount");
  const maxAmount = toNumber(scheme.maxAmount, "scheme.maxAmount");

  if (maxAmount === 0 || minAmount > maxAmount) return false;
  if (requestedAmount < minAmount || requestedAmount > maxAmount) return false;

  if (scheme.minAge != null || scheme.maxAge != null) {
    if (applicant.age == null || !Number.isInteger(applicant.age)) return false;
    if (scheme.minAge != null && applicant.age < scheme.minAge) return false;
    if (scheme.maxAge != null && applicant.age > scheme.maxAge) return false;
  }

  if (
    scheme.minAnnualIncome != null &&
    annualIncome < toNumber(scheme.minAnnualIncome, "scheme.minAnnualIncome")
  ) {
    return false;
  }

  if (
    scheme.maxAnnualIncome != null &&
    annualIncome > toNumber(scheme.maxAnnualIncome, "scheme.maxAnnualIncome")
  ) {
    return false;
  }

  if (
    scheme.projectCategories.length > 0 &&
    !includesCanonical(scheme.projectCategories, applicant.projectCategory)
  ) {
    return false;
  }

  if (
    scheme.eligibleTrades.length > 0 &&
    (!applicant.trade ||
      !includesCanonical(scheme.eligibleTrades, applicant.trade))
  ) {
    return false;
  }

  if (
    scheme.eligibleGenders.length > 0 &&
    (!applicant.gender ||
      !includesCanonical(scheme.eligibleGenders, applicant.gender))
  ) {
    return false;
  }

  if (
    scheme.eligibleApplicantTags.length > 0 &&
    !scheme.eligibleApplicantTags.every((requiredTag) =>
      (applicant.applicantTags ?? []).some(
        (applicantTag) => canonical(applicantTag) === canonical(requiredTag),
      ),
    )
  ) {
    return false;
  }

  return true;
}

function rankCandidate(
  applicant: ApplicantProfile,
  scheme: Scheme,
): RankedCandidate {
  const requestedAmount = toNumber(
    applicant.requestedAmount,
    "requestedAmount",
  );
  const maxAmount = toNumber(scheme.maxAmount, "scheme.maxAmount");
  const minRate =
    scheme.interestRateMin == null
      ? null
      : toNumber(scheme.interestRateMin, "scheme.interestRateMin");
  const maxRate =
    scheme.interestRateMax == null
      ? null
      : toNumber(scheme.interestRateMax, "scheme.interestRateMax");
  const lowestInterestRate = minRate ?? maxRate ?? Number.POSITIVE_INFINITY;
  const highestInterestRate = maxRate ?? minRate ?? 0;

  return {
    scheme,
    coveragePercentage: Math.min(100, (requestedAmount / maxAmount) * 100),
    interestConcession: Math.max(0, highestInterestRate - lowestInterestRate),
    lowestInterestRate,
  };
}

/** Return hard-eligible schemes ranked by amount fit and rate concession. */
export function matchSchemes(
  applicant: ApplicantProfile,
  schemes: Scheme[],
): MatchResult[] {
  const candidates = schemes
    .filter((scheme) => isEligible(applicant, scheme))
    .map((scheme) => rankCandidate(applicant, scheme));
  const greatestConcession = Math.max(
    0,
    ...candidates.map((candidate) => candidate.interestConcession),
  );

  return candidates
    .map((candidate) => ({
      scheme: candidate.scheme,
      coveragePercentage: candidate.coveragePercentage,
      interestConcession: candidate.interestConcession,
      rankScore:
        0.6 * candidate.coveragePercentage +
        0.4 *
          (greatestConcession === 0
            ? 0
            : (candidate.interestConcession / greatestConcession) * 100),
      lowestInterestRate: candidate.lowestInterestRate,
    }))
    .sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        a.lowestInterestRate - b.lowestInterestRate ||
        a.scheme.slug.localeCompare(b.scheme.slug),
    )
    .map((candidate) => ({
      scheme: candidate.scheme,
      coveragePercentage: candidate.coveragePercentage,
      interestConcession: candidate.interestConcession,
      rankScore: candidate.rankScore,
    }));
}
