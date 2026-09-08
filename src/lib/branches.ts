import "server-only";

import { type BranchWithDistance, rankBranches } from "@/lib/branch-ranking";
import { prisma } from "@/lib/prisma";

const MAX_RADIUS_KM = 500;

interface RawBranchRow {
  id: string;
  name: string;
  type: string;
  address_line: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  fund_quota_amount: unknown;
  available_fund_amount: unknown;
  npa_percentage: unknown;
  distance_metres: number | string;
  latitude: number | string;
  longitude: number | string;
}

function finiteNumber(value: unknown): number | null {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function findDistrictCenter(district: string) {
  const [center] = await prisma.$queryRaw<Array<{ lat: number | string | null; lng: number | string | null }>>`
    SELECT
      AVG(ST_Y(location::geometry)) AS lat,
      AVG(ST_X(location::geometry)) AS lng
    FROM channel_partners
    WHERE is_active = true
      AND is_verified = true
      AND location IS NOT NULL
      AND LOWER(TRIM(district)) = LOWER(${district.trim()})
  `;

  if (!center || center.lat == null || center.lng == null) return null;
  return { latitude: Number(center.lat), longitude: Number(center.lng) };
}

export async function findNearbyBranches(input: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  schemeId?: string;
  confirmedOnly?: boolean;
}) {
  if (input.confirmedOnly && !input.schemeId) throw new Error("Choose a scheme before filtering confirmed partners");
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new RangeError("Latitude must be between -90 and 90");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new RangeError("Longitude must be between -180 and 180");
  }
  if (!Number.isFinite(input.radiusKm) || input.radiusKm < 1 || input.radiusKm > MAX_RADIUS_KM) {
    throw new RangeError(`Radius must be between 1 and ${MAX_RADIUS_KM} kilometres`);
  }

  const radiusMetres = input.radiusKm * 1000;
  const rows = await prisma.$queryRaw<RawBranchRow[]>`
    SELECT
      id,
      name,
      type::text AS type,
      address_line,
      district,
      state,
      pincode,
      phone,
      fund_quota_amount,
      available_fund_amount,
      npa_percentage,
      ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography
      ) AS distance_metres,
      ST_Y(location::geometry) AS latitude,
      ST_X(location::geometry) AS longitude
    FROM channel_partners
    WHERE is_active = true
      AND is_verified = true
      AND location IS NOT NULL
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
        ${radiusMetres}
      )
      AND (${!input.confirmedOnly} OR EXISTS (
        SELECT 1 FROM (
          SELECT status, verified_at, expires_at FROM branch_scheme_support
          WHERE partner_id = channel_partners.id AND scheme_id = ${input.schemeId ?? ""}
          ORDER BY id DESC LIMIT 1
        ) latest WHERE status = 'SUPPORTED' AND verified_at <= NOW() AND expires_at > NOW()
      ))
    ORDER BY distance_metres ASC
  `;

  const branches: BranchWithDistance[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    addressLine: row.address_line,
    district: row.district,
    state: row.state,
    pincode: row.pincode,
    phone: row.phone,
    distanceMetres: Number(row.distance_metres),
    fundQuotaAmount: finiteNumber(row.fund_quota_amount),
    availableFundAmount: finiteNumber(row.available_fund_amount),
    npaPercentage: finiteNumber(row.npa_percentage),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));

  return rankBranches(branches);
}
