# Implementation Phases

This is the authoritative delivery roadmap for the SIH Scheme Matching
Platform. Work proceeds one phase at a time, with a review checkpoint before
the next phase begins.

## Scope and architecture

- Fullstack: Next.js 14+ App Router, TypeScript, Tailwind CSS, Prisma, and Neon
  PostgreSQL with PostGIS.
- AI/ML: a separately deployed FastAPI microservice. This repository contains
  only a typed client and a mock adapter; it must never contain the Python
  service.
- Express is not part of the platform.

## Phase 0 — Foundations

**Goal:** Put the database schema and project wiring in place before feature
code.

- Define `User`, `LoanScheme`, `ChannelPartner`, `Application`, and
  `DocumentUpload` in `prisma/schema.prisma`.
- Store the AI service's structured applicant output: `project_category`,
  `requested_amount`, `annual_income`, `trade`, and `gender`.
- Enable PostGIS and add the partner geography column and GiST index through a
  raw SQL migration because Prisma cannot query the geography type natively.
- Configure pooled and direct Neon URLs for the app and Prisma workflows.
- Seed realistic micro-finance, term-loan, and education-loan schemes.

**Checkpoint:** Review `schema.prisma` before beginning Phase 1.

## Phase 1 — Core business logic

**Goal:** Make the application's business logic pure and unit-testable before
building UI.

- `lib/matching.ts`: accept applicant data and `LoanScheme[]`, apply hard
  eligibility rules, and rank eligible schemes by coverage and interest
  concession.
- `lib/finance.ts`: calculate EMI at 6.5%–8.0% annual interest, apply the
  0.5%–1.0% female rebate, and recalculate amortization after a 3–12 month
  moratorium.

**Checkpoint:** Demonstrate both modules without a frontend.

## Phase 2 — App structure, authentication, and routing

**Goal:** Build a navigable skeleton with access control.

- Add App Router route groups for the eligibility wizard, scheme finder,
  application flow, branch locator, and admin dashboard.
- Use Server Actions for form submissions. Reserve Route Handlers for endpoints
  called by the external AI service.
- Add Auth.js/NextAuth role-based access for applicants and admin users such as
  channel-partner or bank officers.

**Checkpoint:** Routes exist, admin pages are gated, and stub forms submit with
Server Actions.

## Phase 3 — Geospatial branch locator

**Goal:** Rank nearby branches with PostGIS and display them on a map.

- Use the raw migration to enable PostGIS and maintain the partner geography
  column and GiST index.
- Query branches with Prisma `$queryRaw` and `ST_DWithin`.
- Rank the result set with
  `0.40 × (1 / distance) + 0.35 × fund quota − 0.25 × NPA percentage`.
- Render ranked pins with Leaflet or Mapbox.

**Checkpoint:** A latitude and longitude return ranked branches on a map.

## Phase 4 — AI service integration boundary

**Goal:** Make the mock and future FastAPI endpoint interchangeable.

- Add `lib/ai-service.ts` as a typed fetch client.
- Validate requests and responses with Zod schemas shared by both mock and real
  adapters.
- Ensure every AI-dependent feature calls this client rather than embedding a
  hardcoded response.

**Checkpoint:** Switching the adapter requires no downstream application
changes.

## Phase 5 — Documents, output, and admin

**Goal:** Complete the applicant journey and officer tooling.

- Generate a pre-sanction PDF from `Application` data with
  `@react-pdf/renderer` or `pdf-lib`.
- Add admin lead-triage and application-status views.

**Checkpoint:** The wizard-to-match-to-branch-to-application-to-PDF flow works,
and an admin can view and triage leads.

## Working agreement

- Complete one phase at a time and pause at its checkpoint unless explicitly
  asked to continue.
- Briefly document non-obvious Prisma, PostGIS, and App Router decisions.
- Flag and mock every dependency on the external AI service.
- Keep the service contract stable so the AI/ML team can connect FastAPI with
  minimal fullstack changes.
