import { describe, expect, it } from "vitest";
import { isAtmListing, schemeLender } from "@/lib/scheme-lender";
import overrides from "../../prisma/local-place-overrides.json";
import { chooseExactPlace, normalizePlaceName } from "@/lib/place-search";

describe("SBI contact matching and twin-city precision", () => {
  it("matches the lender before limiting nearby results", () => {
    const lender = schemeLender("sbi-student-loan-unsecured")!;
    const pattern = new RegExp(lender.namePattern, "i");
    expect(pattern.test("SBI Dharwad Main Branch")).toBe(true);
    expect(pattern.test("State Bank of India")).toBe(true);
    expect(pattern.test("South Indian Bank")).toBe(false);
    expect(pattern.test("Canara Bank")).toBe(false);
    expect(pattern.test("NSBI Cooperative Bank")).toBe(false);
  });
  it("does not guess the lender for a generic government scheme", () => {
    expect(schemeLender("pm-vishwakarma")).toBeNull();
  });
  it("excludes ATMs even when the source labels them as banks", () => {
    expect(isAtmListing("State Bank of India ATM")).toBe(true);
    expect(isAtmListing("State Bank of India")).toBe(false);
  });
  it("offers both towns for Hubli-Dharwad instead of inventing a midpoint", () => {
    const key = normalizePlaceName("Hubli-Dharwad");
    const candidates = overrides.filter(place => place.aliases.includes(key)).map(place => ({ ...place, exactMatch: true }));
    expect(candidates.map(place => place.name)).toEqual(["Hubballi", "Dharwad"]);
    expect(chooseExactPlace(candidates)).toBeNull();
  });
});
