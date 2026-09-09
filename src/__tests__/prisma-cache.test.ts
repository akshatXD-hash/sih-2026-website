import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ created: vi.fn(), disconnect: vi.fn().mockResolvedValue(undefined) }));
vi.mock("server-only", () => ({}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));
vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class { constructor() { mocks.created(); } $disconnect = mocks.disconnect; },
}));
const cache = globalThis as unknown as { prisma?: unknown; prismaConstructor?: unknown };
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("DATABASE_URL", "postgresql://test.invalid/test"); delete cache.prisma; delete cache.prismaConstructor; });
afterEach(() => { delete cache.prisma; delete cache.prismaConstructor; vi.unstubAllEnvs(); });

it("replaces an old unversioned client after schema generation", async () => {
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const stale = { $disconnect: disconnect };
  cache.prisma = stale;
  const { prisma } = await import("@/lib/prisma");
  expect(prisma).not.toBe(stale);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(mocks.created).toHaveBeenCalledOnce();
});

it("reuses the connection pool on hot reload when the schema is unchanged", async () => {
  const first = await import("@/lib/prisma");
  vi.resetModules();
  const second = await import("@/lib/prisma");
  expect(second.prisma).toBe(first.prisma);
  expect(mocks.created).toHaveBeenCalledOnce();
});

it("replaces a client tagged with a different schema", async () => {
  cache.prisma = { $disconnect: mocks.disconnect };
  cache.prismaConstructor = "old-schema";
  await import("@/lib/prisma");
  expect(mocks.created).toHaveBeenCalledOnce();
  expect(cache.prismaConstructor).toBeDefined();
  expect(cache.prismaConstructor).not.toBe("old-schema");
});
