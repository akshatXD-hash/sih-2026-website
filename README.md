# Kaarva — Intelligent Public Credit & Scheme Matching Platform

Kaarva helps applicants discover loan schemes, understand eligibility, find
nearby branches, and prepare an application for officer review. Built for SIH
2026, it brings the journey from an initial funding need to document review
into one website.

**AI assists. Rules decide.** Eligibility is checked against structured scheme
rules; AI helps interpret language and documents. A human officer makes the
lending decision, and the generated pre-sanction PDF is provisional.

## What the website includes

- An authenticated eligibility wizard with text and multilingual voice input.
- Explainable scheme results showing matched rules, unmet requirements, and
  missing information, with links to scheme sources.
- City, village, and PIN-code search, mapped banks, and ranked application
  partners, with branch-specific scheme support reviewed by officers.
- Editable applicant profiles, skill readiness exercises, and saved preparation
  plans. Learning progress does not determine eligibility or approval.
- Document uploads, OCR-assisted income extraction, an EMI/moratorium calculator,
  and provisional PDF downloads.
- An officer dashboard for document review, private notes, application status
  changes, audit history, and branch scheme verification.

## Technology

| Layer | Implementation |
| --- | --- |
| Web application | Next.js 16 App Router, React 19, TypeScript |
| Styling and maps | Tailwind CSS 4, Leaflet |
| Database | Prisma 7, Neon PostgreSQL, PostGIS |
| Authentication and validation | Auth.js, Zod |
| Documents | Cloudinary authenticated assets, pdf-lib |
| AI and voice | External FastAPI adapter, Groq speech transcription |
| Checks | Vitest, ESLint |

The AI model service is maintained separately. This repository validates and
consumes its output through a swappable mock or remote adapter.

See [`IMPLEMENTATION_PHASES.md`](./IMPLEMENTATION_PHASES.md) for the
authoritative project sequence and its review checkpoints.

## AI service handoff

The external AI/FastAPI team should start with
[`AI_SERVICE_README.md`](./AI_SERVICE_README.md). It explains how the Prisma
schema maps to the AI JSON contract, which fields and enums to return, how
extraction integrates with deterministic matching, and where the
database/security boundary sits.

## Getting started

Use Node.js 22.12+ in the 22.x series, or Node.js 24+, with npm. Prisma's
runtime requirement is stricter than Next.js's minimum. You also need a
PostgreSQL database with permission to enable PostGIS; this project is
configured for Neon.

```bash
git clone https://github.com/akshatXD-hash/sih-2026-website.git
cd sih-2026-website
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell,
or `cp .env.example .env` in a POSIX shell). Replace the database placeholders
with the pooled and direct connection strings from your development database.
Install dependencies, then generate an authentication secret:

```bash
npm ci
npx auth secret
```

Ensure the generated `AUTH_SECRET` is available to the app and replace the
placeholder in `.env`. Set `AUTH_TRUST_HOST=true` only when the host headers
are trusted. Keep local environment files out of Git.

Apply the committed migrations and seed your development database:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

Public registration creates only `APPLICANT` users. To exercise the protected
officer dashboard locally, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
(12+ characters) in `.env`, rerun `npm run db:seed`, and sign in at `/login`.
The seed never contains a hardcoded password.

### Environment configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Neon connection for the application |
| `DIRECT_URL` | Direct database connection for migrations and seeding |
| `AUTH_SECRET` | Generated secret for authentication |
| `AUTH_TRUST_HOST` | Trust host headers only on a trusted deployment |
| `AI_SERVICE_MODE` | `mock` for deterministic AI responses; `remote` for FastAPI |
| `AI_SERVICE_URL`, `AIML_SERVICE_URL` | External AI service settings; see `.env.example` and the AI handoff guide |
| `AI_SERVICE_TIMEOUT_MS` | AI request timeout in milliseconds |
| `GROQ_API_KEY` | Real voice transcription; remove the placeholder if unused |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required for document uploads and delivery |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional development officer account |
| `SHADOW_DATABASE_URL` | Optional separate database for creating development migrations |

Mock AI mode still requires a database for authenticated application flows.
Document uploads require valid Cloudinary credentials. The seed does not import
the nationwide place and bank directory; follow
[LOCATION_DIRECTORY.md](./LOCATION_DIRECTORY.md) to enable that dataset.

## Routes and authorization

| Route | Purpose |
| --- | --- |
| `/` | Public introduction to Kaarva |
| `/register`, `/login` | Account creation and sign-in |
| `/eligibility` | Start an owned application draft |
| `/eligibility/[applicationId]/finance` | Complete financial details |
| `/schemes` | Compare eligibility results and scheme terms |
| `/branches` | Find banks and select an eligible application partner |
| `/applications/[applicationId]/profile` | Review or update draft answers |
| `/applications/new` | Prepare documents, action plan, and application |
| `/assistant` | Scheme questions and answers |
| `/admin` | Officer application dashboard |
| `/admin/applications/[applicationId]` | Review an individual application |
| `/admin/branch-support` | Record branch scheme evidence; ADMIN and REVIEWER only |

- `/eligibility` is a two-step applicant wizard that creates an owned draft.
- `/schemes`, `/branches`, and `/applications/new` continue the applicant flow.
- `/admin` accepts `ADMIN`, `CHANNEL_PARTNER`, and `REVIEWER` roles only.
- Auth.js uses its required `/api/auth/[...nextauth]` protocol handler. Feature
  forms use Server Actions. The pre-sanction PDF uses a protected Route Handler
  because a binary download cannot be returned by a form action.
- `src/proxy.ts` performs optimistic redirects. Pages, database reads, and every
  Server Action repeat authorization checks because Proxy is not the security
  boundary.

## Branch locator and scheme verification

- `src/lib/branches.ts` runs parameterized PostGIS `ST_DWithin` radius queries.
- Results are ranked by normalized distance, available quota, and NPA health.
- Only active, verified partners with a geographic point can be selected.
- Branch selection uses an authenticated Server Action and checks application
  ownership; viewing the map never mutates data.
- GeoNames places and OpenStreetMap banks support broader location discovery.
  Public bank listings do not become verified application partners.
- Branch scheme confirmations require evidence and expire after 90 days.
  See [the location directory guide](./LOCATION_DIRECTORY.md) for import steps,
  attribution, search behavior, and verification rules.

## AI and voice integration

Set `AI_SERVICE_MODE=mock` for deterministic offline development or `remote` to
call the configured `AI_SERVICE_URL`. Every endpoint is represented by a typed,
Zod-validated method exposed through `src/lib/ai-service.ts`. See
[`AI_SERVICE_README.md`](./AI_SERVICE_README.md) for endpoint mapping and the
mandatory human confirmation rules for extracted data.

The applicant UI exposes the complete boundary without putting the FastAPI URL
or implementation in the browser:

- `/eligibility` can extract structured fields from an English or Hindi
  description, but requires the applicant to review and confirm them.
- `/schemes` can explain the deterministic shortlist and simplify each scheme's
  terms. AI never adds an ineligible scheme or changes a ranking score.
- `/assistant` provides scheme Q&A with bounded conversation history and a
  clear warning not to enter personal identifiers.
- `/applications/new` runs certificate OCR on supported uploaded evidence and
  requires confirmation before applying extracted income.
- `/admin` gives authorized officers a manual AI service health check.

All interactive text features use authenticated Server Actions. The
browser sends only the user's prompt, selected language, or application ID;
owned application data and eligible candidates are rebuilt on the server.

Voice features use authenticated `/api/voice/transcribe`, `/api/voice/intent`,
and `/api/voice/auto-fill` Route Handlers. Configure `GROQ_API_KEY` for real
speech transcription. Development fallback transcripts are fixed examples,
not recognition of the uploaded audio.

## Documents, PDF, and officer review

- Applicant files are checked by size, MIME signature, and ownership before a
  server-side Cloudinary upload. The API secret is never sent to the browser.
- Cloudinary assets use authenticated delivery. Downloads are authorized by the
  app before it creates a five-minute signed URL.
- Income and caste documents can be sent through the typed FastAPI OCR client.
  Applicants explicitly confirm extracted facts; officers separately verify or
  reject the original document.
- The application page includes an EMI/moratorium calculator and a provisional
  pre-sanction PDF download. The PDF clearly states that it is not an approval.
- `/admin` supports lead filters. `/admin/applications/[applicationId]` supports
  documents, private notes, controlled status transitions, and audit history.

Configure Cloudinary with the exact **Cloud name** shown in its dashboard. A
project/display name is not interchangeable with the cloud name:

```env
CLOUDINARY_CLOUD_NAME="exact-cloud-name"
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

Uploads accept PDF, JPEG, PNG, and WebP files up to 5 MB. Keep the API secret in
server-only environment variables and rotate it immediately if it is exposed.

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
`Unsupported("geography(Point, 4326)")`. The committed initial migration enables the
`postgis` extension before the table is created and adds a GiST index. Query
or update that field with parameterized raw SQL/TypedSQL; Prisma CRUD remains
available for the model because the field is nullable.

The seed data is representative development data. Interest rates and lender
eligibility vary and must be verified against the source before production use.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production application |
| `npm start` | Serve an existing production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests during development |
| `npm run pdf:sample` | Generate and check a sample pre-sanction PDF |
| `npm run db:generate` | Regenerate Prisma Client; also runs after install |
| `npm run db:deploy` | Apply committed database migrations |
| `npm run db:migrate -- --name <migration-name>` | Create a migration for a schema change in development |
| `npm run db:seed` | Populate development data and the optional officer account |
| `npm run db:studio` | Browse the configured database with Prisma Studio |
| `npm run db:locations` | Import previously downloaded location datasets |

For application changes, run `npm test`, `npm run lint`, and `npm run build`.
Database integration checks are opt-in; their setup is documented in the
location directory and action-plan guides below.

For deployment, configure the server environment, install dependencies, run
`npm run db:deploy` and `npm run db:generate`, then `npm run build` and
`npm start`. Use development seeding deliberately; it is not a deployment step.

## Repository guide

| Path | Contents |
| --- | --- |
| `src/app/` | Applicant, authentication, and officer routes; actions and API handlers |
| `src/components/` | Interface components, maps, forms, and AI interactions |
| `src/lib/` | Matching, authorization, database access, integrations, and domain logic |
| `src/__tests__/` | Automated tests |
| `prisma/` | Schema, committed migrations, scheme catalogue, and seed data |
| `scripts/` | Location import tools and PDF sample generation |
| `public/` | Static website assets |

- [AI service handoff](./AI_SERVICE_README.md): API contracts and integration boundaries.
- [Location directory](./LOCATION_DIRECTORY.md): datasets, imports, and branch verification.
- [Explainable matching and action plans](./docs/explainable-matching-and-action-plan.md): rule explanations, preparation steps, and demo checks.
- [Implementation phases](./IMPLEMENTATION_PHASES.md): project sequence and review checkpoints.
- [Agent instructions](./AGENTS.md): repository-specific guidance for coding agents.
