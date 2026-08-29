/**
 * Pure, deterministic branch ranking logic.
 *
 * Scores nearby channel partners using a weighted formula:
 *   score = 0.40 × distanceScore + 0.35 × fundScore + 0.25 × npaScore
 *
 * Each component is normalized to [0, 100]:
 *   - distanceScore: inversely proportional to distance (closer = higher)
 *   - fundScore: ratio of available funds to total quota (more = higher)
 *   - npaScore: inversely proportional to NPA percentage (lower NPA = higher)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A branch row returned from the PostGIS radius query, before scoring. */
export interface BranchWithDistance {
  id: string;
  name: string;
  type: string;
  addressLine: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  /** Distance in metres from the query point. */
  distanceMetres: number;
  /** Total loan quota assigned to this branch. */
  fundQuotaAmount: number | null;
  /** Remaining available loan funds. */
  availableFundAmount: number | null;
  /** Non-performing asset percentage (0–100). */
  npaPercentage: number | null;
  /** Latitude extracted from the PostGIS point. */
  latitude: number;
  /** Longitude extracted from the PostGIS point. */
  longitude: number;
}

/** A branch after the scoring formula has been applied. */
export interface ScoredBranch extends BranchWithDistance {
  /** Distance in km, rounded to 1 decimal. */
  distanceKm: number;
  /** Individual component scores, each 0–100. */
  distanceScore: number;
  fundScore: number;
  npaScore: number;
  /** Final weighted score 0–100. */
  score: number;
}

// ---------------------------------------------------------------------------
// Weights (from IMPLEMENTATION_PHASES.md)
// ---------------------------------------------------------------------------

const W_DISTANCE = 0.4;
const W_FUND = 0.35;
const W_NPA = 0.25;

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Distance score: inverse-distance mapping to [0, 100].
 *
 * Uses `100 / (1 + d)` where `d` is distance in km so that:
 *   - 0 km  → 100
 *   - 1 km  → 50
 *   - 9 km  → 10
 *   - 99 km →  1
 */
function computeDistanceScore(distanceMetres: number): number {
  const km = Math.max(0, distanceMetres) / 1000;
  return round2((100 / (1 + km)) * 1);
}

/**
 * Fund score: ratio of available funds to total quota × 100.
 *
 * Missing data → pessimistic score of 0.
 */
function computeFundScore(
  availableFundAmount: number | null,
  fundQuotaAmount: number | null,
): number {
  if (
    availableFundAmount == null ||
    fundQuotaAmount == null ||
    fundQuotaAmount <= 0
  ) {
    return 0;
  }
  const ratio = Math.min(1, Math.max(0, availableFundAmount / fundQuotaAmount));
  return round2(ratio * 100);
}

/**
 * NPA score: penalizes higher NPA. `100 - npaPercentage` clamped to [0, 100].
 *
 * Missing data → pessimistic score of 50 (mid-range assumption).
 */
function computeNpaScore(npaPercentage: number | null): number {
  if (npaPercentage == null) return 50;
  return round2(Math.max(0, Math.min(100, 100 - npaPercentage)));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score and rank an array of nearby branches.
 *
 * The returned array is sorted by descending score. Ties are broken by
 * ascending distance so the closest branch wins.
 */
export function rankBranches(branches: BranchWithDistance[]): ScoredBranch[] {
  return branches
    .map((branch) => {
      const distanceKm = round1(Math.max(0, branch.distanceMetres) / 1000);
      const distanceScore = computeDistanceScore(branch.distanceMetres);
      const fundScore = computeFundScore(
        branch.availableFundAmount,
        branch.fundQuotaAmount,
      );
      const npaScore = computeNpaScore(branch.npaPercentage);

      const score = round2(
        W_DISTANCE * distanceScore +
          W_FUND * fundScore +
          W_NPA * npaScore,
      );

      return {
        ...branch,
        distanceKm,
        distanceScore,
        fundScore,
        npaScore,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceMetres - b.distanceMetres ||
        a.name.localeCompare(b.name),
    );
}
