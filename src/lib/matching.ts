/**
 * Eligibility matching engine.
 *
 * Pure function — no database, UI, or external dependencies.
 * Accepts an applicant profile and a list of loan schemes, returns only
 * schemes the applicant qualifies for, ranked best-fit first.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApplicantProfile {
  annualIncome: number;
  projectCategory: string;
  requestedAmount: number;
  trade?: string | null;
  gender?: string | null;
}

/**
 * Minimal scheme shape required by the matcher.
 * Accepts Prisma LoanScheme objects via structural typing — no import needed.
 */
export interface Scheme {
  id: string;
  slug: string;
  name: string;
  provider: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  minAnnualIncome?: number | null;
  maxAnnualIncome?: number | null;
  interestRateMin?: number | null;
  interestRateMax?: number | null;
  projectCategories: string[];
  eligibleTrades: string[];
  eligibleGenders: string[];
  isActive: boolean;
}

export interface MatchResult {
  scheme: Scheme;
  coverageRatio: number;
  interestConcession: number;
  rankScore: number;
}

// ---------------------------------------------------------------------------
// Eligibility check
// ---------------------------------------------------------------------------

function isEligible(applicant: ApplicantProfile, scheme: Scheme): boolean {
  if (!scheme.isActive) return false;

  // Amount must fall within scheme bounds
  if (applicant.requestedAmount < scheme.minAmount) return false;
  if (applicant.requestedAmount > scheme.maxAmount) return false;

  // Income must fall within scheme bounds (unbounded if scheme has no limit)
  const minIncome = scheme.minAnnualIncome ?? 0;
  const maxIncome = scheme.maxAnnualIncome ?? Infinity;
  if (applicant.annualIncome < minIncome) return false;
  if (applicant.annualIncome > maxIncome) return false;

  // Project category must be in the scheme's list (if scheme specifies any)
  if (
    scheme.projectCategories.length > 0 &&
    !scheme.projectCategories.includes(applicant.projectCategory)
  ) {
    return false;
  }

  // Trade must match (if scheme specifies eligible trades and applicant has one)
  if (
    scheme.eligibleTrades.length > 0 &&
    applicant.trade != null &&
    applicant.trade !== "" &&
    !scheme.eligibleTrades.includes(applicant.trade)
  ) {
    return false;
  }

  // Gender must match (if scheme specifies eligible genders and applicant has one)
  if (
    scheme.eligibleGenders.length > 0 &&
    applicant.gender != null &&
    applicant.gender !== "" &&
    !scheme.eligibleGenders.includes(applicant.gender)
  ) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

function rankScheme(
  applicant: ApplicantProfile,
  scheme: Scheme,
): MatchResult {
  const coverageRatio = applicant.requestedAmount / scheme.maxAmount;

  const maxRate = scheme.interestRateMax ?? scheme.interestRateMin ?? 0;
  const minRate = scheme.interestRateMin ?? 0;
  // Concession in percentage points, normalised against a 24pp range
  const interestConcession = maxRate > 0 ? (maxRate - minRate) / 24 : 0;

  const rankScore = 0.6 * coverageRatio + 0.4 * interestConcession;

  return { scheme, coverageRatio, interestConcession, rankScore };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return eligible schemes ranked best-fit first.
 *
 * @param applicant - The applicant's profile (income, project, amount, trade, gender)
 * @param schemes   - All loan schemes to evaluate (typically all active schemes)
 * @returns         - Ranked list of eligible schemes with scoring metadata
 */
export function matchSchemes(
  applicant: ApplicantProfile,
  schemes: Scheme[],
): MatchResult[] {
  return schemes
    .filter((scheme) => isEligible(applicant, scheme))
    .map((scheme) => rankScheme(applicant, scheme))
    .sort((a, b) => b.rankScore - a.rankScore);
}
