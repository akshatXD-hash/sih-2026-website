import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); }, redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireApplicant: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { application: { findFirst: vi.fn(), updateMany: vi.fn() }, bankDirectory: { findUnique: vi.fn() }, applicationTask: { upsert: vi.fn() }, applicantCompetency: { upsert: vi.fn() }, $transaction: vi.fn() } }));
vi.mock("@/lib/branch-scheme-support", () => ({ getBranchSchemeSupport: vi.fn(), partnerSupportsScheme: vi.fn() }));
import { setPlanTaskAction, saveCompetenciesAction } from "@/app/(applicant)/plan-actions";
import { savePreferredBankAction, updateEligibilityProfileAction } from "@/app/(applicant)/actions";
import { getBranchSchemeSupport } from "@/lib/branch-scheme-support";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

describe("action plan ownership and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApplicant).mockResolvedValue({ id: "owner" } as never);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: "app", projectCategory: "micro-enterprise", documents: [], competencies: [], planTasks: [] } as never);
  });
  it("does not let another user save a bank preference", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null);
    await expect(savePreferredBankAction("other", "bank")).rejects.toThrow("not-found");
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });
  it("saves a real bank preference without manufacturing confirmed support", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ loanScheme: { id: "scheme", slug: "sbi-student" } } as never);
    vi.mocked(prisma.bankDirectory.findUnique).mockResolvedValue({ id: "bank", name: "State Bank of India Dharwad" } as never);
    vi.mocked(getBranchSchemeSupport).mockResolvedValue(new Map());
    vi.mocked(prisma.application.updateMany).mockResolvedValue({ count: 1 });
    await expect(savePreferredBankAction("app", "bank")).rejects.toThrow("saved=branch");
    expect(prisma.application.updateMany).toHaveBeenCalledWith({ where: { id: "app", userId: "owner", status: "DRAFT", loanSchemeId: "scheme" }, data: { preferredBankId: "bank", channelPartnerId: null } });
  });
  it("rejects branches with known unsupported schemes", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ loanScheme: { id: "scheme", slug: "sbi-student" } } as never);
    vi.mocked(prisma.bankDirectory.findUnique).mockResolvedValue({ id: "bank", name: "SBI Dharwad" } as never);
    vi.mocked(getBranchSchemeSupport).mockResolvedValue(new Map([["BANK:bank", { status: "NOT_SUPPORTED" }]]));
    await expect(savePreferredBankAction("app", "bank")).rejects.toThrow("does not support");
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });
  it("rejects access to another applicant's plan before any writes", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null);
    await expect(setPlanTaskAction("other", "practice:v1:costing", true)).rejects.toThrow("not-found");
    await expect(saveCompetenciesAction("other", new FormData())).rejects.toThrow("not-found");
    expect(prisma.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", userId: "owner" } }));
    expect(prisma.applicationTask.upsert).not.toHaveBeenCalled();
    expect(prisma.applicantCompetency.upsert).not.toHaveBeenCalled();
  });
  it("rejects forged completion of required tasks", async () => {
    await expect(setPlanTaskAction("app", "scheme", true)).rejects.toThrow("cannot be manually updated");
    expect(prisma.applicationTask.upsert).not.toHaveBeenCalled();
  });
  it("allows saved practice to be reopened", async () => {
    await setPlanTaskAction("app", "practice:v1:costing", false);
    expect(prisma.applicationTask.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { applicationId_taskKey: { applicationId: "app", taskKey: "practice:v1:costing" } }, update: { completedAt: null } }));
  });
  it("rejects claimed verified skill levels", async () => {
    const form = new FormData();
    for (const key of ["costing", "records", "marketing"]) form.set(key, "VERIFIED");
    await expect(saveCompetenciesAction("app", form)).rejects.toThrow();
    expect(prisma.applicantCompetency.upsert).not.toHaveBeenCalled();
  });
  it("preserves unknown amounts and clears stale scheme selections only on owned drafts", async () => {
    vi.mocked(prisma.application.updateMany).mockResolvedValue({ count: 1 });
    const form = new FormData();
    Object.entries({ projectCategory: "micro-enterprise", gender: "FEMALE", age: "30", requestedAmount: "", annualIncome: "" }).forEach(([k, v]) => form.set(k, v));
    await expect(updateEligibilityProfileAction("app", {}, form)).rejects.toThrow("redirect:/schemes");
    expect(prisma.application.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "app", userId: "owner", status: "DRAFT" }, data: expect.objectContaining({ requestedAmount: null, annualIncome: null, loanSchemeId: null, channelPartnerId: null }) }));
  });
});
