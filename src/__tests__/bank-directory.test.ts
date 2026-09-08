import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: vi.fn() } }));
import { prisma } from "@/lib/prisma";
import { findDirectoryBanks } from "@/lib/bank-directory";
const query = vi.mocked(prisma.$queryRaw);
function row(distance: number) {
  return { id: `bank-${distance}`, name: "Bank", address_line: null, district: null, state: null,
    pincode: null, phone: null, latitude: 12.97, longitude: 77.59, distance_metres: distance,
    source_url: "https://www.openstreetmap.org/node/1", imported_at: new Date("2026-09-07") };
}
describe("bank directory search", () => {
  beforeEach(() => query.mockReset());
  it("expands sparse rural results without claiming they are inside the chosen radius", async () => {
    query.mockResolvedValue([row(25000), row(1000), row(12000), row(40000)]);
    const result = await findDirectoryBanks(12.97, 77.59, 5);
    expect(result.expanded).toBe(true);
    expect(result.branches.map(bank => bank.distanceKm)).toEqual([1, 12, 25]);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("respects the requested radius when enough nearby banks exist", async () => {
    query.mockResolvedValue([row(1000), row(2000), row(3000), row(20000)]);
    const result = await findDirectoryBanks(12.97, 77.59, 5);
    expect(result.expanded).toBe(false);
    expect(result.branches).toHaveLength(3);
    expect(result.branches[0].availableFundAmount).toBeNull();
    expect(result.branches[0].directorySource?.url).toContain("openstreetmap.org");
  });
  it("returns an honest empty result", async () => {
    query.mockResolvedValue([]);
    expect((await findDirectoryBanks(12, 77, 10)).branches).toEqual([]);
  });
  it("rejects invalid coordinates before querying", async () => {
    await expect(findDirectoryBanks(100, 77, 10)).rejects.toThrow(RangeError);
    expect(query).not.toHaveBeenCalled();
  });
});
