import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizePlaceName, type SearchPlace } from "@/lib/place-search";

export async function findPlaces(query: string): Promise<SearchPlace[]> {
  const [name, ...context] = query.split(",");
  const key = normalizePlaceName(name);
  if (key.length < 2 || query.length > 120) return [];
  const region = normalizePlaceName(context.join(" "));
  // Exact names and aliases precede prefix suggestions. PIN searches return
  // individual localities, never an arbitrary coordinate averaged across a PIN.
  return prisma.$queryRaw<SearchPlace[]>`
    SELECT id, name, district, state, pincode, kind, latitude, longitude,
      (name_key = ${key} OR aliases @> ARRAY[${key}]::text[]) AS "exactMatch"
    FROM search_places
    WHERE (name_key = ${key} OR aliases @> ARRAY[${key}]::text[]
      OR pincode = ${key} OR name_key LIKE ${`${key}%`})
      AND (${region} = '' OR LOWER(CONCAT_WS(' ', district, state)) LIKE ${`%${region}%`})
    ORDER BY CASE WHEN name_key = ${key} OR aliases @> ARRAY[${key}]::text[] THEN 0
      WHEN pincode = ${key} THEN 1 ELSE 2 END,
      CASE WHEN kind = 'city' THEN 0 ELSE 1 END, population DESC, name, id
    LIMIT 12
  `;
}

export async function findPlaceById(id: string) {
  if (id.length > 100) return null;
  const [place] = await prisma.$queryRaw<SearchPlace[]>`
    SELECT id, name, district, state, pincode, kind, latitude, longitude
    FROM search_places WHERE id = ${id} LIMIT 1
  `;
  return place ?? null;
}
