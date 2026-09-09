import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { documentUpload: { updateMany: vi.fn() } } }));
import { reviewDocumentAction } from "@/app/(admin)/admin/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
const form = (decision: string, reason = "") => { const data = new FormData(); data.set("decision", decision); data.set("reason", reason); return data; };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "officer" } as never);
  vi.mocked(prisma.documentUpload.updateMany).mockResolvedValue({ count: 1 });
});
it.each(["", "   "])("returns an inline error for empty rejection reason %j without changing the document", async reason => {
  expect(await reviewDocumentAction("app", "doc", {}, form("reject", reason))).toHaveProperty("error");
  expect(prisma.documentUpload.updateMany).not.toHaveBeenCalled();
});
it("allows verification without a rejection reason", async () => {
  expect(await reviewDocumentAction("app", "doc", {}, form("verify"))).toHaveProperty("success");
  expect(prisma.documentUpload.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "VERIFIED", verifiedById: "officer", failureReason: null }) }));
  expect(revalidatePath).toHaveBeenCalledWith("/applications/new");
});
it("saves the trimmed rejection reason", async () => {
  expect(await reviewDocumentAction("app", "doc", {}, form("reject", "  Blurry image  "))).toHaveProperty("success");
  expect(prisma.documentUpload.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED", failureReason: "Blurry image" }) }));
});
it("handles a document already reviewed without a page crash", async () => {
  vi.mocked(prisma.documentUpload.updateMany).mockResolvedValue({ count: 0 });
  expect(await reviewDocumentAction("app", "doc", {}, form("verify"))).toHaveProperty("error");
});
it("keeps database failures recoverable", async () => {
  vi.mocked(prisma.documentUpload.updateMany).mockRejectedValue(new Error("offline"));
  expect(await reviewDocumentAction("app", "doc", {}, form("verify"))).toEqual({ error: "We could not save the review. Please try again." });
});
it("still requires an authenticated officer", async () => {
  vi.mocked(requireAdmin).mockRejectedValue(new Error("unauthorized"));
  await expect(reviewDocumentAction("app", "doc", {}, form("verify"))).rejects.toThrow("unauthorized");
  expect(prisma.documentUpload.updateMany).not.toHaveBeenCalled();
});
