import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { loanScheme: { findFirst: vi.fn() }, $queryRaw: vi.fn(), $executeRaw: vi.fn() } }));
import { saveBranchSupport } from "@/app/(admin)/admin/branch-support/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
const admin = { id: "reviewer-id", role: "ADMIN", name: "Reviewer", email: "reviewer@example.com", isActive: true } as Awaited<ReturnType<typeof requireAdmin>>;
function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({ branchId: "bank-1", branchType: "BANK", schemeId: "scheme-1", status: "SUPPORTED",
    evidenceUrl: "https://bank.example/confirmed-branch", notes: "Branch and scheme checked against the official listing",
    verifiedDate: new Date().toISOString().slice(0, 10), ...overrides }).forEach(([key, value]) => data.set(key, value));
  return data;
}
describe("branch support reviewer authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    vi.mocked(prisma.loanScheme.findFirst).mockResolvedValue({ id: "scheme-1" } as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "bank-1" }]);
  });
  it("rejects a channel partner attempting global verification", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ...admin, role: "CHANNEL_PARTNER" });
    await expect(saveBranchSupport({}, form())).rejects.toThrow("unauthorized");
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it("does not write without evidence", async () => {
    expect((await saveBranchSupport({}, form({ evidenceUrl: "" }))).error).toBeTruthy();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it("does not write support for an unknown branch", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    expect((await saveBranchSupport({}, form())).error).toContain("Branch not found");
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it("does not write support for an inactive scheme", async () => {
    vi.mocked(prisma.loanScheme.findFirst).mockResolvedValue(null);
    expect((await saveBranchSupport({}, form())).error).toContain("active scheme");
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it("records the session reviewer rather than a submitted identity", async () => {
    expect(await saveBranchSupport({}, form({ reviewerId: "forged-user" }))).toEqual({ saved: true });
    const args = vi.mocked(prisma.$executeRaw).mock.calls[0];
    expect(args).toContain("reviewer-id");
    expect(args).not.toContain("forged-user");
  });
});
