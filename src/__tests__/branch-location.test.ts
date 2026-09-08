import { describe, expect, it, vi } from "vitest";
import { parseBoundedNumber, resolveBranchLocation } from "@/lib/branch-location";

describe("branch search location", () => {
  it("does not invent a location when none was supplied", async () => {
    const lookup = vi.fn();
    expect(await resolveBranchLocation({}, lookup)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("does not replace an unknown district with Pune", async () => {
    expect(await resolveBranchLocation({ district: "Unknown" }, async () => null)).toBeNull();
  });

  it("uses the actual coordinate pair, including zero", async () => {
    const lookup = vi.fn();
    expect(await resolveBranchLocation({ lat: "0", lng: "77.2", district: "Pune" }, lookup))
      .toMatchObject({ latitude: 0, longitude: 77.2 });
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    { lat: "19" }, { lng: "72" }, { lat: "91", lng: "72" },
    { lat: "19oops", lng: "72" }, { lat: "NaN", lng: "72" },
  ])("rejects invalid coordinates instead of switching cities: %j", async (input) => {
    const lookup = vi.fn();
    expect(await resolveBranchLocation({ ...input, district: "Pune" }, lookup)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("labels a district approximation instead of calling it the user's location", async () => {
    const lookup = vi.fn().mockResolvedValue({ latitude: 18.5, longitude: 73.8 });
    const location = await resolveBranchLocation({ district: " Pune " }, lookup);
    expect(lookup).toHaveBeenCalledWith("Pune");
    expect(location?.label).toContain("approximate");
  });

  it.each(["", " ", "12oops", "Infinity", ["12", "13"], undefined])("rejects malformed numeric query parameters: %j", (value) => {
    expect(parseBoundedNumber(value, -90, 90)).toBeNull();
  });
});
