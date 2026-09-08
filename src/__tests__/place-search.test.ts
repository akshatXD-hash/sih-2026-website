import { describe, expect, it } from "vitest";
import { chooseExactPlace, normalizePlaceName, placeLabel, type SearchPlace } from "@/lib/place-search";

const place = (overrides: Partial<SearchPlace> = {}): SearchPlace => ({
  id: "city-1", name: "Bengaluru", district: null, state: "Karnataka", pincode: null,
  latitude: 12.97, longitude: 77.59, kind: "city", exactMatch: true, ...overrides,
});
describe("place search", () => {
  it("normalizes spaces and Latin accents", () => {
    expect(normalizePlaceName("  BENGALŪRU  ")).toBe("bengaluru");
    expect(normalizePlaceName("New-Delhi")).toBe("new delhi");
  });
  it("preserves Indian script vowel marks", () => {
    expect(normalizePlaceName("ಬೆಂಗಳೂರು")).toBe("ಬೆಂಗಳೂರು");
  });
  it("does not select an unrelated prefix result", () => {
    expect(chooseExactPlace([place({ exactMatch: false })])).toBeNull();
  });
  it("asks the user when a village name is ambiguous", () => {
    expect(chooseExactPlace([place({ kind: "postal" }), place({ id: "other", kind: "postal" })])).toBeNull();
  });
  it("prefers the city point over postal localities with the same name", () => {
    expect(chooseExactPlace([place(), place({ id: "postal", kind: "postal" })])?.id).toBe("city-1");
  });
  it("does not silently pick between two identically named cities", () => {
    expect(chooseExactPlace([place(), place({ id: "other" })])).toBeNull();
  });
  it("includes state and PIN so users can distinguish places", () => {
    expect(placeLabel(place({ pincode: "560001" }))).toBe("Bengaluru, Karnataka, 560001");
  });
});
