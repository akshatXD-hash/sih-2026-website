import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Client } from "pg";
import { normalizePlaceName } from "../src/lib/place-search";
import { isAtmListing } from "../src/lib/scheme-lender";
import localPlaceOverrides from "../prisma/local-place-overrides.json";

const root = resolve(process.argv[2] ?? "tmp/location-import");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const coordinates = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng)
  && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
const places = new Map<string, Record<string, unknown>>();
for (const line of read("postal/IN.txt").split(/\r?\n/)) {
  const c = line.split("\t");
  if (c[0] !== "IN" || !c[2] || !coordinates(Number(c[9]), Number(c[10]))) continue;
  const id = "postal-" + createHash("sha256").update(c.slice(0, 9).join("|")).digest("hex").slice(0, 24);
  places.set(id, { id, name: c[2], name_key: normalizePlaceName(c[2]), aliases: [], district: c[5],
    state: c[3], pincode: c[1], kind: "postal", population: 0, latitude: Number(c[9]), longitude: Number(c[10]),
    source_url: "https://download.geonames.org/export/zip/IN.zip" });
}
const states = new Map(read("admin1.txt").split(/\r?\n/).map(line => {
  const c = line.split("\t"); return [c[0], c[1]];
}));
for (const line of read("cities/cities500.txt").split(/\r?\n/)) {
  const c = line.split("\t");
  if (c[8] !== "IN" || !coordinates(Number(c[4]), Number(c[5]))) continue;
  const id = `geonames-${c[0]}`;
  places.set(id, { id, name: c[1], name_key: normalizePlaceName(c[1]),
    aliases: [...new Set([c[2], ...c[3].split(",")].map(normalizePlaceName).filter(Boolean))],
    district: null, state: states.get(`IN.${c[10]}`) ?? null, pincode: null, kind: "city",
    population: Number(c[14]) || 0, latitude: Number(c[4]), longitude: Number(c[5]),
    source_url: `https://www.geonames.org/${c[0]}` });
}

// Reviewed OSM city nodes supplement gaps in GeoNames. Preserve the existing
// Hubballi id so saved links still work; shared twin-city aliases offer a choice.
for (const place of localPlaceOverrides) places.set(place.id, {
  ...place, aliases: place.aliases.map(normalizePlaceName),
});

interface OsmBank {
  type: string; id: number; lat?: number; lon?: number;
  center?: { lat: number; lon: number }; tags?: Record<string, string>;
}
const osm = JSON.parse(read("india-banks.json"));
if (osm.remark || !Array.isArray(osm.elements)) throw new Error("Incomplete Overpass response");
const banks = (osm.elements as OsmBank[]).flatMap(element => {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const name = tags.name || tags["name:en"] || tags.brand || tags.operator;
  if (!name || isAtmListing(name) || tags.amenity !== "bank" || !["node", "way", "relation"].includes(element.type)
    || lat == null || lng == null || !coordinates(lat, lng)) return [];
  return [{ id: `osm-${element.type}-${element.id}`, name: name.slice(0, 300),
    address_line: tags["addr:full"] || [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(", ") || null,
    district: tags["addr:district"] ?? null, state: tags["addr:state"] ?? null,
    pincode: tags["addr:postcode"] ?? null, phone: tags.phone || tags["contact:phone"] || null,
    latitude: lat, longitude: lng, source_url: `https://www.openstreetmap.org/${element.type}/${element.id}` }];
});
if (places.size < 10000 || banks.length < 1000) throw new Error("Unexpectedly small dataset; refusing import");

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database URL is not configured");
  const db = new Client({ connectionString, connectionTimeoutMillis: 15000 });
  await db.connect();
  try {
    await db.query("BEGIN");
    const placeRows = [...places.values()];
    for (let i = 0; i < placeRows.length; i += 1000) {
      await db.query(`INSERT INTO search_places (id,name,name_key,aliases,district,state,pincode,kind,population,latitude,longitude,source_url)
        SELECT id,name,name_key,aliases,district,state,pincode,kind,population,latitude,longitude,source_url
        FROM jsonb_to_recordset($1::jsonb) AS x(id text,name text,name_key text,aliases text[],district text,state text,pincode text,kind text,population integer,latitude float8,longitude float8,source_url text)
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,name_key=EXCLUDED.name_key,aliases=EXCLUDED.aliases,
          district=EXCLUDED.district,state=EXCLUDED.state,pincode=EXCLUDED.pincode,latitude=EXCLUDED.latitude,
          longitude=EXCLUDED.longitude,population=EXCLUDED.population,source_url=EXCLUDED.source_url,imported_at=NOW()`,
      [JSON.stringify(placeRows.slice(i, i + 1000))]);
    }
    for (let i = 0; i < banks.length; i += 1000) {
      await db.query(`INSERT INTO bank_directory (id,name,address_line,district,state,pincode,phone,source_url,location)
        SELECT id,name,address_line,district,state,pincode,phone,source_url,ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography
        FROM jsonb_to_recordset($1::jsonb) AS x(id text,name text,address_line text,district text,state text,pincode text,phone text,source_url text,latitude float8,longitude float8)
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,address_line=EXCLUDED.address_line,district=EXCLUDED.district,
          state=EXCLUDED.state,pincode=EXCLUDED.pincode,phone=EXCLUDED.phone,source_url=EXCLUDED.source_url,location=EXCLUDED.location,imported_at=NOW()`,
      [JSON.stringify(banks.slice(i, i + 1000))]);
    }
    await db.query("COMMIT");
    await db.query("ANALYZE search_places");
    await db.query("ANALYZE bank_directory");
    console.info(`Imported ${places.size} places and ${banks.length} mapped banks. Existing channel partners unchanged.`);
  } catch (error) {
    await db.query("ROLLBACK"); throw error;
  } finally { await db.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Import failed"); process.exitCode = 1; });
