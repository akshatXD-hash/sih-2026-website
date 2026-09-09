import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

describe.runIf(process.env.TEST_ACTION_PLAN_DATABASE === "1")("action plan persistence", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  beforeAll(async () => { ({ prisma } = await import("@/lib/prisma")); });
  afterAll(async () => { await prisma?.$disconnect(); });
  it("round-trips progress and competency without retaining test data", async () => {
    const rollback = new Error("intentional-test-rollback");
    const userId = `plan-test-${randomUUID()}`;
    await expect(prisma.$transaction(async tx => {
      await tx.user.create({ data: { id: userId, email: `${userId}@example.invalid`, name: "Temporary plan test", passwordHash: "not-a-login-hash" } });
      const application = await tx.application.create({ data: { userId } });
      const key = { applicationId: application.id, taskKey: "practice:v1:costing" };
      await tx.applicationTask.upsert({ where: { applicationId_taskKey: key }, create: { ...key, completedAt: new Date() }, update: {} });
      await tx.applicantCompetency.create({ data: { applicationId: application.id, skillKey: "costing", level: "LEARNING" } });
      const loaded = await tx.application.findUniqueOrThrow({ where: { id: application.id }, include: { planTasks: true, competencies: true } });
      expect(loaded.planTasks).toHaveLength(1);
      expect(loaded.planTasks[0].completedAt).toBeInstanceOf(Date);
      expect(loaded.competencies[0].level).toBe("LEARNING");
      await tx.applicationTask.upsert({ where: { applicationId_taskKey: key }, create: key, update: { completedAt: null } });
      expect(await tx.applicationTask.count({ where: { applicationId: application.id } })).toBe(1);
      expect((await tx.applicationTask.findUniqueOrThrow({ where: { applicationId_taskKey: key } })).completedAt).toBeNull();
      throw rollback;
    }, { timeout: 30000, maxWait: 20000 })).rejects.toBe(rollback);
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
  }, 60000);
});
