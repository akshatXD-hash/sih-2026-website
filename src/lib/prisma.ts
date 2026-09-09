import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConstructor: typeof PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Hot reload preserves globalThis even after `prisma generate`. Reuse a client
// only when it uses the current generated constructor; new relations otherwise fail.
const cachedClient = globalForPrisma.prismaConstructor === PrismaClient
  ? globalForPrisma.prisma
  : undefined;

export const prisma = cachedClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  const previousClient = globalForPrisma.prisma;
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConstructor = PrismaClient;
  if (previousClient && previousClient !== prisma) {
    void previousClient.$disconnect().catch(() => {
      // A stale development pool may already have been closed by hot reload.
    });
  }
}
