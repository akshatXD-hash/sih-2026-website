import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { chooseExactPlace } from "@/lib/place-search";
import { schemeLender } from "@/lib/scheme-lender";

// Explicit opt-in: runs read-only queries against an imported directory.
describe.runIf(process.env.TEST_LOCATION_DATABASE === "1")("imported India directory", () => {
  let findPlaces: typeof import("@/lib/places").findPlaces;
  let findDirectoryBanks: typeof import("@/lib/bank-directory").findDirectoryBanks;
  let prisma: typeof import("@/lib/prisma").prisma;
  beforeAll(async () => {
    ({ findPlaces } = await import("@/lib/places"));
    ({ findDirectoryBanks } = await import("@/lib/bank-directory"));
    ({ prisma } = await import("@/lib/prisma"));
  });
  afterAll(async () => { await prisma.$disconnect(); });
  it("resolves Bengaluru and Bangalore to the same city and finds real nearby banks", async () => {
    const start = performance.now();
    const bengaluru = chooseExactPlace(await findPlaces("Bengaluru"));
    const bangalore = chooseExactPlace(await findPlaces("Bangalore"));
    expect(bengaluru).not.toBeNull();
    expect(bangalore?.id).toBe(bengaluru?.id);
    expect(bengaluru?.state).toBe("Karnataka");
    const result = await findDirectoryBanks(bengaluru!.latitude, bengaluru!.longitude, 10);
    expect(result.branches.length).toBeGreaterThan(10);
    expect(result.expanded).toBe(false);
    console.info(`Bengaluru: ${result.branches.length} banks within 10 km; ${Math.round(performance.now() - start)} ms including initial DB connection`);
  }, 30000);
  it("finds rural postal localities without depending on registered partners", async () => {
    const places = await findPlaces("562110");
    expect(places.length).toBeGreaterThan(0);
    expect(places.every(place => place.pincode === "562110")).toBe(true);
    const rural = places[0];
    const result = await findDirectoryBanks(rural.latitude, rural.longitude, 5);
    expect(result.branches.length).toBeGreaterThan(0);
    console.info(`Rural PIN 562110 (${rural.name}): ${result.branches.length} banks; expanded=${result.expanded}`);
  }, 30000);
  it("handles city and state context and preserves no-match results", async () => {
    expect((await findPlaces("Bengaluru, Karnataka")).length).toBeGreaterThan(0);
    expect(await findPlaces("NotARealPlaceZYX987")).toEqual([]);
  }, 30000);
  it("finds SBI contacts around Hubballi and Dharwad without inventing scheme confirmation", async () => {
    const scheme = await prisma.loanScheme.findFirstOrThrow({ where: { slug: "sbi-student-loan-unsecured" } });
    const lender = schemeLender(scheme.slug)!;
    const hubli = chooseExactPlace(await findPlaces("Hubli"));
    const hubballi = chooseExactPlace(await findPlaces("Hubballi"));
    const dharwad = chooseExactPlace(await findPlaces("Dharwad"));
    const dharwar = chooseExactPlace(await findPlaces("Dharwar"));
    expect(hubli?.id).toBe(hubballi?.id);
    expect(dharwar?.id).toBe(dharwad?.id);
    expect(dharwad).not.toBeNull();
    expect(chooseExactPlace(await findPlaces("Hubli-Dharwad"))).toBeNull();
    for (const place of [hubli!, dharwad!]) {
      const results = await findDirectoryBanks(place.latitude, place.longitude, 10, { schemeId: scheme.id, lenderPattern: lender.namePattern });
      expect(results.branches.length).toBeGreaterThan(5);
      expect(results.branches.every(branch => new RegExp(lender.namePattern, "i").test(branch.name))).toBe(true);
      expect(results.branches.some(branch => branch.addressLine?.length)).toBe(true);
      expect(results.branches.some(branch => /\batm\b/i.test(branch.name))).toBe(false);
      const confirmed = await findDirectoryBanks(place.latitude, place.longitude, 10, { schemeId: scheme.id, confirmedOnly: true });
      const { getBranchSchemeSupport } = await import("@/lib/branch-scheme-support");
      const contactSupport = await getBranchSchemeSupport(scheme.id, results.branches.map(branch => branch.id), []);
      expect(contactSupport).toBeInstanceOf(Map);
      const support = await getBranchSchemeSupport(scheme.id, confirmed.branches.map(branch => branch.id), []);
      expect(confirmed.branches.every(branch => support.get("BANK:" + branch.id)?.status === "SUPPORTED")).toBe(true);
    }
  }, 30000);
});
