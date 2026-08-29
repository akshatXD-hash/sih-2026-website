# SIH Scheme Matching Platform

Fullstack application built with Next.js App Router, TypeScript, Tailwind CSS,
Prisma, and Neon PostgreSQL with PostGIS. AI/ML is an external FastAPI service;
this repository validates and consumes its output through a swappable mock or
remote adapter.

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
direct connection strings from Neon. Generate `AUTH_SECRET` with
`npx auth secret`; set `AUTH_TRUST_HOST=true` only when the deployment platform
forwards a trusted host header. Then generate the client, create the development
migration, and seed the database:

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

Public registration creates only `APPLICANT` users. To exercise the protected
officer dashboard locally, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
(12+ characters) in `.env`, rerun `npm run db:seed`, and sign in at `/login`.
The seed never contains a hardcoded password.

## Phase 2 routes and authorization

- `/eligibility` is a two-step applicant wizard that creates an owned draft.
- `/schemes`, `/branches`, and `/applications/new` continue the applicant flow.
- `/admin` accepts `ADMIN`, `CHANNEL_PARTNER`, and `REVIEWER` roles only.
- Auth.js uses its required `/api/auth/[...nextauth]` protocol handler. Feature
  forms use Server Actions; future custom Route Handlers remain reserved for
  calls from the external AI service.
- `src/proxy.ts` performs optimistic redirects. Pages, database reads, and every
  Server Action repeat authorization checks because Proxy is not the security
  boundary.

## Phase 3 branch locator

- `src/lib/branches.ts` runs parameterized PostGIS `ST_DWithin` radius queries.
- Results are ranked by normalized distance, available quota, and NPA health.
- Only active, verified partners with a geographic point can be selected.
- Branch selection uses an authenticated Server Action and checks application
  ownership; viewing the map never mutates data.

## Phase 4 AI boundary

Set `AI_SERVICE_MODE=mock` for deterministic offline development or `remote` to
call the configured `AI_SERVICE_URL`. Every endpoint is represented by a typed,
Zod-validated method exposed through `src/lib/ai-service.ts`. See
[`AI_SERVICE_README.md`](./AI_SERVICE_README.md) for endpoint mapping and the
mandatory human confirmation rules for extracted data.

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
npm test
npm run lint
npm run build
```
