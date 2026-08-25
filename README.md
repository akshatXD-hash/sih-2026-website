# SIH Scheme Matching Platform

Fullstack application built with Next.js App Router, TypeScript, Tailwind CSS,
Prisma, and Neon PostgreSQL with PostGIS. AI/ML is an external FastAPI service;
this repository only stores its structured response and will call or mock it in
later phases.

See [`IMPLEMENTATION_PHASES.md`](./IMPLEMENTATION_PHASES.md) for the
authoritative project sequence and its review checkpoints.

## AI service handoff

The external AI/FastAPI team should start with
[`AI_SERVICE_README.md`](./AI_SERVICE_README.md). It explains how the Prisma
schema maps to the AI JSON contract, which fields and enums to return, how
extraction integrates with deterministic matching, and where the
database/security boundary sits.

## Getting started

Copy `.env.example` to `.env` and replace the placeholders with the pooled and
direct connection strings from Neon. Then generate the client, create the
development migration, and seed the database:

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Neon and migrations

- `DATABASE_URL` is the pooled Neon URL used by the Next.js runtime.
- `DIRECT_URL` is the direct Neon URL used by Prisma CLI commands and seeding.
- Keep `sslmode=verify-full&channel_binding=require` on Neon URLs so the server
  certificate and SCRAM channel binding are verified explicitly.
- `SHADOW_DATABASE_URL` is optional. If Neon does not permit Prisma to create a
  temporary shadow database, create a separate Neon branch and set this value.
  It must never point at your application database.
- `prisma migrate dev` is for development. Use `npm run db:deploy` in deployed
  environments.

### PostGIS

Prisma represents `channel_partners.location` as
`Unsupported("geography(Point, 4326)")`. The initial migration must enable the
`postgis` extension before the table is created and must add a GiST index. Query
or update that field with parameterized raw SQL/TypedSQL; Prisma CRUD remains
available for the model because the field is nullable.

The seed data is representative development data. Interest rates and lender
eligibility vary and must be verified against the source before production use.

## Useful commands

```bash
npm run db:generate
npm run db:migrate -- --name <migration-name>
npm run db:seed
npm run db:studio
npm run lint
npm run build
```
