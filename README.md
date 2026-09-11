# Kaarva — SIH Scheme Matching Platform

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
npm run pdf:sample
npm run lint
npm run build
```
