import "dotenv/config";

import { defineConfig, env } from "prisma/config";

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prefer Neon's direct URL for CLI operations; fall back to DATABASE_URL
    // when a single direct connection string is used in development.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
