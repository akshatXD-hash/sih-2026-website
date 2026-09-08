import "server-only";
import { prisma } from "@/lib/prisma";
import type { ScoredBranch } from "@/lib/branch-ranking";

interface BankRow {
  id: string; name: string; address_line: string | null; district: string | null;
  state: string | null; pincode: string | null; phone: string | null;
  latitude: number; longitude: number; distance_metres: number;
  source_url: string; imported_at: Date;
}

export async function findDirectoryBanks(latitude: number, longitude: number, radiusKm: number, options: { schemeId?: string; confirmedOnly?: boolean; lenderPattern?: string } = {}) {
  if (options.confirmedOnly && !options.schemeId) throw new Error("Choose a scheme before filtering confirmed banks");
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 500) throw new RangeError("Invalid bank search area");
  // One bounded spatial query covers the selected radius and rural fallback.
  const fallbackRadius = Math.max(radiusKm, 100);
  const rows = await prisma.$queryRaw<BankRow[]>`
    SELECT id, name, address_line, district, state, pincode, phone, source_url, imported_at,
      ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude,
      ST_Distance(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}),4326)::geography) AS distance_metres
    FROM bank_directory
    WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}),4326)::geography, ${fallbackRadius * 1000})
      AND name !~* '(^|[^a-z])atm([^a-z]|$)|cash[[:space:]]+(deposit|withdrawal)[[:space:]]+machine'
      AND (${options.lenderPattern ?? ""} = '' OR name ~* ${options.lenderPattern ?? ""})
      AND (${options.schemeId ?? ""} = '' OR NOT EXISTS (
        SELECT 1 FROM (
          SELECT status, verified_at, expires_at FROM branch_scheme_support
          WHERE bank_id = bank_directory.id AND scheme_id = ${options.schemeId ?? ""}
          ORDER BY id DESC LIMIT 1
        ) latest WHERE status = 'NOT_SUPPORTED' AND verified_at <= NOW() AND expires_at > NOW()
      ))
      AND (${!options.confirmedOnly} OR EXISTS (
        SELECT 1 FROM (
          SELECT status, verified_at, expires_at FROM branch_scheme_support
          WHERE bank_id = bank_directory.id AND scheme_id = ${options.schemeId ?? ""}
          ORDER BY id DESC LIMIT 1
        ) latest WHERE status = 'SUPPORTED' AND verified_at <= NOW() AND expires_at > NOW()
      ))
    ORDER BY location <-> ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}),4326)::geography
    LIMIT 60
  `;
  const ordered = rows.sort((a, b) => a.distance_metres - b.distance_metres || a.id.localeCompare(b.id));
  const within = ordered.filter(row => row.distance_metres <= radiusKm * 1000);
  const selected = within.length >= 3 ? within : ordered.slice(0, Math.max(3, within.length));
  const branches: ScoredBranch[] = selected.map(row => ({
    id: row.id, name: row.name, type: "BANK", addressLine: row.address_line,
    district: row.district, state: row.state, pincode: row.pincode, phone: row.phone,
    latitude: row.latitude, longitude: row.longitude, distanceMetres: row.distance_metres,
    distanceKm: Math.round(row.distance_metres / 100) / 10,
    fundQuotaAmount: null, availableFundAmount: null, npaPercentage: null,
    score: 0, distanceScore: 0, fundScore: 0, npaScore: 0,
    directorySource: { url: row.source_url, importedAt: row.imported_at.toISOString() },
  }));
  return { branches, expanded: branches.some(branch => branch.distanceMetres > radiusKm * 1000),
    radiusKm: fallbackRadius };
}
