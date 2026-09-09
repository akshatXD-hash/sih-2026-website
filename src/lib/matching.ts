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

export type EligibilityProfile = { [K in keyof ApplicantProfile]?: ApplicantProfile[K] | null };
export type CheckStatus = "PASS" | "FAIL" | "UNKNOWN";
export interface EligibilityCheck {
  key: string;
  requirement: string;
  provided: string;
  status: CheckStatus;
  sourceUrl?: string | null;
}
export interface EligibilityAssessment {
  status: "ELIGIBLE" | "INELIGIBLE" | "INFORMATION_MISSING";
  checks: EligibilityCheck[];
}

/** The same checks power explanations and the server's selection guard. */
export function evaluateEligibility(applicant: EligibilityProfile, scheme: Scheme): EligibilityAssessment {
  const checks: EligibilityCheck[] = [];
  const add = (key: string, requirement: string, provided: string, status: CheckStatus) =>
    checks.push({ key, requirement, provided, status, sourceUrl: scheme.sourceUrl });
  add("active", "Scheme is accepting applications in our catalogue", scheme.isActive ? "Active" : "Inactive", scheme.isActive ? "PASS" : "FAIL");
  const numeric = (key: "requestedAmount" | "annualIncome" | "age", label: string, min: number | null, max: number | null) => {
    const raw = applicant[key];
    const missing = raw == null || (typeof raw === "string" && raw.trim() === "");
    const value = missing ? null : toNumber(raw, key);
    const requirement = label + (min == null && max == null ? " must be provided" : ": " + (min ?? 0).toLocaleString("en-IN") + " to " + (max == null ? "no listed upper limit" : max.toLocaleString("en-IN")));
    add(key, requirement, value == null ? "Not provided" : value.toLocaleString("en-IN"), value == null ? "UNKNOWN" : (min != null && value < min) || (max != null && value > max) || (key === "age" && !Number.isInteger(value)) ? "FAIL" : "PASS");
  };
  const minimum = toNumber(scheme.minAmount, "scheme.minAmount");
  const maximum = toNumber(scheme.maxAmount, "scheme.maxAmount");
  numeric("requestedAmount", "Requested amount (₹)", minimum, maximum);
  if (maximum === 0 || minimum > maximum) add("amountConfiguration", "Scheme must have a valid lending range", "Catalogue range needs review", "FAIL");
  numeric("annualIncome", "Annual income (₹)", scheme.minAnnualIncome == null ? null : toNumber(scheme.minAnnualIncome, "scheme.minAnnualIncome"), scheme.maxAnnualIncome == null ? null : toNumber(scheme.maxAnnualIncome, "scheme.maxAnnualIncome"));
  if (scheme.minAge != null || scheme.maxAge != null) numeric("age", "Age in years", scheme.minAge ?? null, scheme.maxAge ?? null);
  const choice = (key: "projectCategory" | "trade" | "gender", label: string, allowed: string[], required = false) => {
    if (!allowed.length && !required) return;
    const value = applicant[key]?.trim();
    add(key, allowed.length ? label + ": " + allowed.join(", ") : label + " must be provided", value || "Not provided", !value ? "UNKNOWN" : !allowed.length || includesCanonical(allowed, value) ? "PASS" : "FAIL");
  };
  choice("projectCategory", "Project category", scheme.projectCategories, true);
  choice("trade", "Trade", scheme.eligibleTrades);
  choice("gender", "Gender", scheme.eligibleGenders);
  for (const tag of scheme.eligibleApplicantTags) {
    add("tag:" + tag, "Applicant category: " + tag.replaceAll("_", " "), applicant.applicantTags == null ? "Not provided" : applicant.applicantTags.join(", ") || "None selected", applicant.applicantTags == null ? "UNKNOWN" : includesCanonical(applicant.applicantTags, tag) ? "PASS" : "FAIL");
  }
  return { status: checks.some(c => c.status === "FAIL") ? "INELIGIBLE" : checks.some(c => c.status === "UNKNOWN") ? "INFORMATION_MISSING" : "ELIGIBLE", checks };
}

function isEligible(applicant: ApplicantProfile, scheme: Scheme): boolean {
  return evaluateEligibility(applicant, scheme).status === "ELIGIBLE";
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
  const candidates: ReturnType<typeof rankCandidate>[] = [];
  let greatestConcession = 0;

  for (const scheme of schemes) {
    if (isEligible(applicant, scheme)) {
      const candidate = rankCandidate(applicant, scheme);
      candidates.push(candidate);
      if (candidate.interestConcession > greatestConcession) {
        greatestConcession = candidate.interestConcession;
      }
    }
  }

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
