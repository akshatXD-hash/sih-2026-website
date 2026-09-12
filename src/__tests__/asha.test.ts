import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({ uploadAuthenticatedDocument: vi.fn(), deleteDocumentAsset: vi.fn(), createDocumentDownloadUrl: vi.fn() }));
vi.mock("@/lib/matching", () => ({ evaluateEligibility: vi.fn(() => ({ status: "ELIGIBLE" })) }));
vi.mock("@/lib/prisma", () => ({ prisma: { ashaCase: { findFirst: vi.fn(), updateMany: vi.fn() }, application: { updateMany: vi.fn() }, applicationStatusEvent: { create: vi.fn() }, loanScheme: { findFirst: vi.fn() }, $transaction: vi.fn() } }));
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { requireAshaWorker, ownedAshaCase } from "@/lib/asha/access";
import { caseFormSchema } from "@/lib/asha/forms";
import { hasAdminAccess, hasApplicantAccess, loginDestination } from "@/lib/auth/roles";
import { chooseAshaSchemeAction, downloadAshaDocumentAction, saveAshaCaseAction, saveAshaFollowUpAction, submitAshaCaseAction, uploadAshaDocumentAction } from "@/app/(asha)/asha-worker/actions";
import { uploadAuthenticatedDocument } from "@/lib/cloudinary";
const profile = { name: "Test villager", village: "Test village", phone: "", contactKind: "NONE", contactName: "", projectCategory: "micro-enterprise", trade: "", age: "", gender: "", annualIncome: "", requestedAmount: "", applicantTags: [] };
describe("ASHA workspace isolation and intake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "worker", role: "ASHA_WORKER", isActive: true } as never);
    vi.mocked(prisma.ashaCase.findFirst).mockResolvedValue(null);
  });
  it("keeps ASHA logins out of both existing workspaces", () => {
    expect(hasAdminAccess("ASHA_WORKER")).toBe(false);
    expect(hasApplicantAccess("ASHA_WORKER")).toBe(false);
    expect(loginDestination("ASHA_WORKER", "/admin")).toBe("/asha-worker");
    expect(loginDestination("ASHA_WORKER", "/asha-worker/case")).toBe("/asha-worker/case");
    expect(loginDestination("APPLICANT", "/asha-worker")).toBe("/eligibility");
  });
  it.each(["ADMIN", "REVIEWER", "CHANNEL_PARTNER", "APPLICANT"])("denies %s the worker workspace", async role => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "other", role, isActive: true } as never);
    await expect(requireAshaWorker()).rejects.toThrow("/unauthorized");
  });
  it("blocks every case action when the case belongs to someone else", async () => {
    const form = new FormData();
    for (const action of [chooseAshaSchemeAction, saveAshaFollowUpAction, submitAshaCaseAction, uploadAshaDocumentAction]) await expect(action("foreign", {}, form)).rejects.toThrow("not-found");
    await expect(saveAshaCaseAction("foreign", {}, form)).rejects.toThrow("not-found");
    await expect(downloadAshaDocumentAction("foreign", "document")).rejects.toThrow("not-found");
    await expect(ownedAshaCase("foreign")).rejects.toThrow("not-found");
    expect(prisma.ashaCase.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", workerId: "worker" } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
    expect(uploadAuthenticatedDocument).not.toHaveBeenCalled();
  });
  it("requires permission before creating records", async () => {
    expect(await saveAshaCaseAction(null, {}, new FormData())).toHaveProperty("error");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("preserves unknown amounts and supports a villager with no phone", () => {
    const parsed = caseFormSchema.parse(profile);
    expect(parsed.annualIncome).toBeNull();
    expect(parsed.requestedAmount).toBeNull();
    expect(parsed.age).toBeNull();
    expect(caseFormSchema.parse({ ...profile, annualIncome: "0" }).annualIncome).toBe(0);
  });
  it("validates shared contacts without treating a number as an account identity", () => {
    expect(caseFormSchema.safeParse({ ...profile, phone: "9876543210", contactKind: "FAMILY" }).success).toBe(false);
    expect(caseFormSchema.parse({ ...profile, phone: "+91 9876543210", contactKind: "FAMILY", contactName: "Sister" }).phone).toBe("+919876543210");
    expect(caseFormSchema.safeParse({ ...profile, phone: "javascript:alert(1)", contactKind: "SELF" }).success).toBe(false);
  });
  it("requires confirmation and refuses inactive schemes on submission", async () => {
    vi.mocked(prisma.ashaCase.findFirst).mockResolvedValue({ application: { status: "DRAFT", loanScheme: { isActive: false } } } as never);
    const form = new FormData();
    expect(await submitAshaCaseAction("case", {}, form)).toHaveProperty("error");
    form.set("confirmation", "yes");
    expect(await submitAshaCaseAction("case", {}, form)).toHaveProperty("error");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("submits an owned draft with a concurrency check and worker audit trail", async () => {
    const updatedAt = new Date();
    vi.mocked(prisma.ashaCase.findFirst).mockResolvedValue({ applicationId: "app", application: { updatedAt, status: "DRAFT", loanScheme: { isActive: true } } } as never);
    vi.mocked(prisma.application.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => (callback as unknown as (tx: typeof prisma) => Promise<unknown>)(prisma));
    const form = new FormData(); form.set("confirmation", "yes");
    expect(await submitAshaCaseAction("case", {}, form)).toHaveProperty("success");
    expect(prisma.application.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "app", status: "DRAFT", ashaCase: { workerId: "worker" }, updatedAt }, data: expect.objectContaining({ status: "SUBMITTED" }) }));
    expect(prisma.applicationStatusEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ changedById: "worker", applicationId: "app", fromStatus: "DRAFT", toStatus: "SUBMITTED" }) }));
  });
});
