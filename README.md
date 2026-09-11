# Kaarva — Intelligent Public Credit & Scheme Matching Platform

> **Public Credit, Decoded.**  
> *“AI assists. Rules decide.”*

Kaarva is a fullstack government loan scheme discovery, matching, and application enablement platform built for the Smart India Hackathon (SIH 2026). It bridges the gap between citizens seeking microfinance, term loans, or education credit and public lending institutions.

The platform combines **deterministic, explainable rule matching**, **PostGIS geospatial branch intelligence**, **multilingual voice-to-form extraction (Groq Whisper)**, **skill readiness action planning**, **document verification & OCR**, and an **audited officer review portal**.

---

## Table of Contents

- [Core Philosophy & Architecture](#core-philosophy--architecture)
- [Complete User Journey & Route Map](#complete-user-journey--route-map)
- [Key Features](#key-features)
  - [1. Multilingual Voice & Conversational Assistant](#1-multilingual-voice--conversational-assistant)
  - [2. Explainable Rule Matching & Scheme Discovery](#2-explainable-rule-matching--scheme-discovery)
  - [3. Geospatial Branch Locator & Directory Intelligence](#3-geospatial-branch-locator--directory-intelligence)
  - [4. Dynamic Action Plan & Skill Readiness](#4-dynamic-action-plan--skill-readiness)
  - [5. Financial Modeling & Provisional Pre-Sanction PDF](#5-financial-modeling--provisional-pre-sanction-pdf)
  - [6. Secure Document Uploads & OCR Evidence Extraction](#6-secure-document-uploads--ocr-evidence-extraction)
  - [7. Administrative Officer Dashboard & Audit State Machine](#7-administrative-officer-dashboard--audit-state-machine)
- [Supported Schemes & Categories](#supported-schemes--categories)
- [Technology Stack](#technology-stack)
- [Project Architecture & Directory Layout](#project-architecture--directory-layout)
- [Database Models & PostGIS Integration](#database-models--postgis-integration)
- [AI & ML Service Integration](#ai--ml-service-integration)
- [Environment Configuration](#environment-configuration)
- [Getting Started & Local Setup](#getting-started--local-setup)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Security & Boundary Guarantees](#security--boundary-guarantees)
- [Available Scripts](#available-scripts)
- [Related Documentation](#related-documentation)

---

## Core Philosophy & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                             APPLICANT                                  │
│   Voice Recording (Hindi / English / Regional) ───► Groq Whisper STT   │
│   Natural Language Description ───────────────────► Intent Extraction  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DETERMINISTIC CORE                              │
│   • Profile & Eligibility Evaluation (Age, Income, Gender, Trade)      │
│   • 100% Explainable Rule Matching (Met / Unmet / Missing)             │
│   • PostGIS Spatial Branch Locator & Bank Ranking (Distance, NPA, Quota)│
│   • Financial Amortization Schedules & Pre-Sanction PDF Generation     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ADMIN & REVIEW STATE MACHINE                       │
│   • Officer Document Verification & OCR Review                         │
│   • Branch Scheme Support Audit (HTTPS evidence, 90-day expiry)        │
│   • Controlled Application Status Transitions & Internal Notes         │
└────────────────────────────────────────────────────────────────────────┘
```

1. **AI Assists, Rules Decide**: AI models extract structured intents from natural language/audio, simplify complex policy jargon, and perform OCR on certificates. AI **never** makes approval decisions, changes ranking scores, or overrides deterministic scheme eligibility rules.
2. **Human in the Loop**: All AI-extracted fields (profile info, OCR income/caste details) require explicit user confirmation before becoming part of the active application.
3. **Auditability & Traceability**: Every status change, note, document verification, and branch scheme confirmation is attributed to a verified user with timestamped event logging.

---

## Complete User Journey & Route Map

| Route | Primary Role | Description & Available Actions |
| :--- | :--- | :--- |
| `/` | Public | High-impact landing page explaining the 4-step journey and trust boundaries. |
| `/register`, `/login` | Public | Secure credentials authentication with Auth.js (NextAuth v5 beta) and role assignment. |
| `/eligibility` | `APPLICANT` | 2-step profile wizard with multilingual voice auto-fill and NLP intent extraction. |
| `/eligibility/[applicationId]/finance` | `APPLICANT` | Financial requirements form (project category, required loan amount, annual income). |
| `/schemes` | `APPLICANT` | Scheme discovery with **Why?** explainability breakdown, criteria matching, and AI comparison. |
| `/branches` | `APPLICANT` | Interactive PostGIS Leaflet map searching 21k+ banks and ranking by distance, quota, and NPA%. |
| `/applications/[applicationId]/profile`| `APPLICANT` | Review and update draft answers (clears earlier partner selection to ensure consistent matching). |
| `/applications/new` | `APPLICANT` | Application creation combining selected scheme, preferred branch, and uploaded documents. |
| `/applications/[applicationId]` | `APPLICANT` | Central hub: skill readiness action plan, EMI simulator, and provisional pre-sanction PDF download. |
| `/assistant` | `APPLICANT` | Bounded conversational Q&A assistant explaining scheme terms, eligibility rules, and subsidies. |
| `/admin` | `ADMIN`, `REVIEWER` | Officer dashboard for lead triage, status progression, internal notes, and AI service health monitor. |
| `/admin/applications/[applicationId]` | `ADMIN`, `REVIEWER` | Detailed officer review page: document verification, private notes, status state machine. |
| `/admin/branch-support` | `ADMIN`, `REVIEWER` | Audit tool to search bank branches and record 90-day verified scheme confirmations with HTTPS links. |
| `/api/applications/[id]/pre-sanction-pdf` | `APPLICANT` | Protected Route Handler streaming generated binary pre-sanction PDF documents. |
| `/api/voice/auto-fill` | `APPLICANT` | Multilingual speech-to-text + structured intent extraction pipeline. |

---

## Key Features

### 1. Multilingual Voice & Conversational Assistant
- **Voice-to-Form Auto-Fill** (`/api/voice/auto-fill`): Speak in Hindi, Marathi, English, or other regional languages to automatically populate eligibility forms. Powered by **Groq Whisper Large v3 Turbo** with local fallback and silence hallucination suppression.
- **Supported Languages**: Hindi (`hi`), Marathi (`mr`), Bengali (`bn`), Tamil (`ta`), Telugu (`te`), Gujarati (`gu`), Kannada (`kn`), Malayalam (`ml`), Punjabi (`pa`), Urdu (`ur`), and English (`en`).
- **AI Scheme Assistant** (`/assistant`): Bounded conversational assistant that answers queries regarding loan policies, subsidy mechanisms, and repayment terms without logging personally identifiable information (PII).
- **Policy Term Simplification**: Jargon simplifier transforms bureaucratic policy terms into plain language in English or Hindi.

### 2. Explainable Rule Matching & Scheme Discovery
- **Deterministic Matcher** (`src/lib/matching.ts`): Evaluates applicant profiles against active loan schemes using structured criteria (turnover, project category, annual income, age, gender concessions, trade, collateral requirements).
- **Transparent "Why?" Breakdown**: For every scheme, applicants can expand a detailed audit trail showing exactly which rules passed, which failed, and what information is still missing.
- **Zero Hallucination Guarantee**: If an applicant requests an amount outside limits or has exceeding income, the reason is clearly cited alongside official source documentation.

### 3. Geospatial Branch Locator & Directory Intelligence
- **PostGIS Spatial Radius Queries** (`src/lib/branches.ts`, `src/lib/bank-directory.ts`): Spatial `ST_DWithin` calculations against India-wide OpenStreetMap bank nodes (21,000+ branches) and GeoNames postal data (162,000+ places).
- **Composite Branch Ranking** (`src/lib/branch-ranking.ts`): Ranks branches considering straight-line distance, available fund quota, and NPA (Non-Performing Asset) health metrics.
- **Branch Scheme Support Auditing** (`/admin/branch-support`): Verified officers record scheme-level branch confirmations backed by HTTPS evidence URLs, valid for 90 days.
- **Smart Rural & Alias Fallbacks**: Supports Hubballi–Dharwad twin-city handling, Bengaluru/Bangalore aliases, postal code multi-village disambiguation, and automated 100 km radius expansions for rural areas.

### 4. Dynamic Action Plan & Skill Readiness
- **Live Checklist** (`src/lib/action-plan.ts`): Computes preparation milestones dynamically from applicant profile requirements, chosen schemes, and document states.
- **Interactive Competency Exercises**: Tailored modules for business applications (unit costing, cash record keeping, local marketing) and education applications (study budgeting, academic evidence organization).
- **Reversible Practice Progress**: Learning readiness does not gate submission or simulate approval scores, ensuring equal opportunity.

### 5. Financial Modeling & Provisional Pre-Sanction PDF
- **EMI & Moratorium Calculator** (`src/lib/finance.ts`): Calculates monthly installments, moratorium grace period capitalization, total payable amounts, and gender-based interest rate concessions (e.g., 0.5% – 1% female interest rebates).
- **Provisional Pre-Sanction Letter Generation** (`src/lib/pre-sanction-pdf.ts`): Server-side PDF generation using `pdf-lib` detailing applicant details, chosen scheme terms, estimated EMI, and clear non-approval provisional disclaimers.

### 6. Secure Document Uploads & OCR Evidence Extraction
- **Zero Client-Secret Exposure**: Files are validated server-side (size cap 5MB, strict MIME inspection: PDF, PNG, JPEG, WebP) and uploaded to Cloudinary in authenticated delivery mode.
- **Supported Document Types**: `AADHAAR`, `PAN`, `CASTE_CERTIFICATE`, `ADDRESS_PROOF`, `INCOME_PROOF`, `BANK_STATEMENT`, `PROJECT_REPORT`, `EDUCATION_CERTIFICATE`, `ADMISSION_LETTER`, `FEE_STRUCTURE`, and `OTHER`.
- **Time-Limited Signed URLs**: Documents are downloaded via transient, 5-minute authenticated signed URLs.
- **OCR Verification Pipeline**: Income and caste certificates can be processed through the AI OCR engine, with side-by-side officer review.

### 7. Administrative Officer Dashboard & Audit State Machine
- **Role-Based Access Control** (`ADMIN`, `CHANNEL_PARTNER`, `REVIEWER`, `APPLICANT`).
- **Application Lifecycle**: Enforces valid state transitions:
  $$\text{DRAFT} \longrightarrow \text{EXTRACTION\_PENDING} \longrightarrow \text{EXTRACTION\_COMPLETE} \longrightarrow \text{SUBMITTED} \longrightarrow \text{UNDER\_REVIEW} \longrightarrow \begin{cases} \text{APPROVED} \longrightarrow \text{DISBURSED} \\ \text{REJECTED} \\ \text{WITHDRAWN} \end{cases}$$
- **Officer Tools**: Lead filtering, internal review notes, document verification toggles, and AI service health monitor.

---

## Supported Schemes & Categories

The database includes comprehensive schemes catalogued across three core loan categories:

1. **Micro Finance (`MICRO_FINANCE`)**:
   - **PM SVANidhi**: Micro-credit for street vendors with working capital loans and digital transaction incentives.
   - **PM MUDRA Yojana (Shishu)**: Uncollateralized loans up to ₹50,000 for early-stage micro-enterprises.
   - **PM Vishwakarma**: Financial support and collateral-free enterprise credit for traditional artisans and craftspeople.
   - **National Scheduled Castes Finance (NSFDC)**: Targeted micro-credit facilities for marginalized entrepreneurs.

2. **Term Loans (`TERM_LOAN`)**:
   - **Prime Minister Employment Generation Programme (PMEGP)**: Credit-linked subsidy programme for manufacturing and service setups.
   - **Stand-Up India**: Bank loans between ₹10 Lakhs and ₹1 Crore for SC/ST and women entrepreneurs for greenfield enterprises.
   - **MUDRA (Kishore & Tarun)**: Scaled funding up to ₹10 Lakhs for established micro/small enterprises.
   - **Credit Guarantee Scheme for Micro & Small Enterprises (CGTMSE)**: Collateral-free credit support.

3. **Education Loans (`EDUCATION_LOAN`)**:
   - **Central Sector Interest Subsidy (CSIS)**: Full interest subsidy during moratorium period for students from economically weaker sections.
   - **Padho Pardesh**: Subsidized education loans for overseas studies for minority community students.
   - **Dr. Ambedkar Central Sector Scheme**: Interest subsidy on educational loans for overseas studies for OBC and EBC students.
   - **SBI Student Loan Scheme / Skill Loan Scheme**: Specialized vocational and higher education loan facilities.

---

## Technology Stack

| Layer | Implementation | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.2 (App Router) | React Server Components, Server Actions, Route Handlers |
| **UI & Styling** | React 19, Tailwind CSS v4 | Responsive editorial design, accessible components, Leaflet maps |
| **Database & ORM** | PostgreSQL (Neon), Prisma ORM 7.10 | Serverless Postgres, `@prisma/adapter-pg`, PostGIS geography types |
| **Geospatial** | PostGIS, Leaflet 1.9.4 | `ST_DWithin` spatial indexing, GiST indexes, interactive maps |
| **Authentication** | Auth.js (NextAuth v5 beta), bcryptjs | Role-based session authorization, Server Action guards |
| **Voice / Speech-to-Text** | Groq Whisper (`whisper-large-v3-turbo`) | High-speed multilingual audio transcription + local fallback |
| **AI Integration** | FastAPI Adapter (`mock` / `remote`) | Zod-typed schema validation, intent extraction, chat, OCR |
| **Storage** | Cloudinary SDK | Authenticated asset delivery, signed short-lived download URLs |
| **PDF Generation** | `pdf-lib` | Server-rendered pre-sanction provisional documents |
| **Testing** | Vitest 4.1.11 | Fast unit and integration tests (25 test suites, 175+ tests) |

---

## Project Architecture & Directory Layout

```
sih-2026-website/
├── prisma/
│   ├── schema.prisma              # Complete DB schema (Users, Schemes, Partners, Apps, Tasks)
│   ├── local-place-overrides.json # Reviewed OSM place nodes (Hubballi-Dharwad, etc.)
│   ├── migrations/                # Versioned SQL migrations including PostGIS setup
│   └── seed.ts                    # Representative schemes, partners, and dev dataset
├── scripts/
│   ├── download-location-data.ps1 # Fetches GeoNames and OSM datasets for India
│   ├── import-location-directory.ts# Upserts 162k places & 21k bank branches into PostGIS
│   └── generate-pdf-sample.test.ts# Sample PDF generator utility
├── src/
│   ├── app/
│   │   ├── (admin)/               # Protected officer routes (/admin, /admin/branch-support)
│   │   ├── (applicant)/           # Applicant wizard (/eligibility, /schemes, /branches, /assistant)
│   │   ├── (auth)/                # Auth flows (/login, /register)
│   │   ├── api/                   # Route handlers (auth protocol, voice transcription, pre-sanction PDF)
│   │   ├── layout.tsx             # Root layout with fonts and shell metadata
│   │   └── page.tsx               # High-impact landing page
│   ├── components/
│   │   ├── ai/                    # Voice recorders, chat widgets, term simplifier dialogs
│   │   ├── applications/          # Application review cards, action plan checklists, notes
│   │   ├── auth/                  # Login & registration forms with client validation
│   │   ├── documents/             # Upload zones, document status pills, OCR confirmation
│   │   ├── finance/               # Interactive EMI & moratorium calculation graphs
│   │   ├── forms/                 # Multi-step eligibility wizards
│   │   └── BranchMap.tsx          # Leaflet map component for branch & bank visualizer
│   ├── lib/
│   │   ├── action-plan.ts         # Dynamic preparation task list & competency logic
│   │   ├── ai-service/            # AI contracts, mock adapter, and remote HTTP client
│   │   ├── auth/                  # Role-based guards and session helpers
│   │   ├── bank-directory.ts      # Spatial OSM bank search and nearest fallback queries
│   │   ├── branch-ranking.ts      # Multi-criteria branch scoring (distance, NPA, quota)
│   │   ├── branch-scheme-support.ts# Audited branch scheme support verification
│   │   ├── cloudinary.ts          # Server-side upload & signed URL generation
│   │   ├── finance.ts             # Exact mathematical EMI, rebate, and moratorium logic
│   │   ├── matching.ts            # Deterministic rule engine & explainability generator
│   │   ├── pre-sanction-pdf.ts    # Binary PDF builder using pdf-lib
│   │   ├── prisma.ts              # Cached Prisma client with PG adapter
│   │   └── voice/whisper.ts       # Multilingual Groq/OpenAI Whisper transcription
│   └── __tests__/                 # Comprehensive Vitest test suite (25 suites)
├── docs/                          # In-depth architectural & matching specifications
├── AI_SERVICE_README.md           # External FastAPI contract & payload definitions
├── LOCATION_DIRECTORY.md          # OpenStreetMap & GeoNames import documentation
├── IMPLEMENTATION_PHASES.md       # Technical implementation roadmap and checkpoints
└── package.json
```

---

## Database Models & PostGIS Integration

The database is built on PostgreSQL with the **PostGIS extension** enabled.

### Key Models
- **`User`**: System accounts with roles (`APPLICANT`, `ADMIN`, `CHANNEL_PARTNER`, `REVIEWER`).
- **`LoanScheme`**: Public credit schemes with structured criteria (income thresholds, age brackets, gender incentives, required documents, interest bounds).
- **`ChannelPartner`**: Lending institutions with fund quotas, NPA rates, and spatial `location` points.
- **`BankDirectory`**: 21,000+ public OSM bank branch points with spatial GiST indexing.
- **`SearchPlace`**: 162,000+ Indian postal localities and cities with GIN alias indexing and Trigram search.
- **`Application`**: Citizen loan application containing deterministic profile state, AI extraction metadata, and lifecycle status.
- **`DocumentUpload`**: Authenticated Cloudinary document references, OCR outputs, and verification status.
- **`BranchSchemeSupport`**: Audited officer confirmations linking specific branches to supported schemes.
- **`ApplicationTask` & `ApplicantCompetency`**: Dynamic readiness checklists and self-reported skill practice milestones.

### Spatial Setup
Prisma represents `channel_partners.location` and `bank_directory.location` as `Unsupported("geography(Point, 4326)")`. The initial migration enables PostGIS before creating these tables and adds spatial GiST indexes. Queries use parameterized raw SQL for high-performance radius searches.

---

## AI & ML Service Integration

The application interfaces with an external AI service or runs fully self-contained using a rich local mock:

| Operation | Method / Endpoint | Purpose |
| :--- | :--- | :--- |
| **Health Check** | `GET /health` | Validates AI service availability and version. |
| **Intent Extraction** | `POST /extract-intent` | Extracts structured loan parameters from freeform text or voice transcripts. |
| **Term Simplification** | `POST /simplify-term` | Explains policy jargon in plain English or Hindi. |
| **Recommendation Explanation**| `POST /explain-recommendation` | Generates comparative notes between eligible schemes. |
| **Scheme Assistant** | `POST /chat` | Multilingual, bounded conversational Q&A without storing PII. |
| **Document OCR** | `POST /ocr/document` | Extracts structured income, name, and certificate IDs from images. |

Set `AI_SERVICE_MODE="mock"` for offline testing or `AI_SERVICE_MODE="remote"` to target the live FastAPI backend.

---

## Environment Configuration

Create a `.env` file in the root directory modeled after `.env.example`:

| Variable | Purpose & Guidance |
| :--- | :--- |
| `DATABASE_URL` | Pooled connection string from Neon (contains `-pooler` in hostname). |
| `DIRECT_URL` | Direct connection string from Neon for Prisma CLI migrations and seeding. |
| `SHADOW_DATABASE_URL` | Optional separate Neon branch URL for creating dev migrations. |
| `AI_SERVICE_MODE` | `mock` for offline local development; `remote` for live FastAPI service. |
| `AI_SERVICE_URL`, `AIML_SERVICE_URL` | URL of the deployed FastAPI service (e.g. `https://sih-26-ai-ml.onrender.com`). |
| `AI_SERVICE_TIMEOUT_MS` | Timeout for AI service requests (defaults to `30000` ms). |
| `GROQ_API_KEY` | Groq Speech-to-Text API Key for Whisper Large v3 Turbo transcription. |
| `CLOUDINARY_CLOUD_NAME` | Exact **Cloud name** shown in Cloudinary dashboard (not project name). |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Server-only Cloudinary credentials for authenticated document storage. |
| `AUTH_SECRET` | Generated authentication secret (generate with `npx auth secret`). |
| `AUTH_TRUST_HOST` | Set to `true` when behind a trusted deployment proxy. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional 12+ character officer credentials created by `npm run db:seed`. |

---

## Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: Use Node.js **22.12+** in the 22.x series, or Node.js **24+**, with npm.
- **PostgreSQL**: With `postgis` extension enabled (configured for Neon).
- **Package Manager**: `npm` (v10+)

### 2. Installation & Secrets
Clone the repository and install dependencies:
```bash
git clone https://github.com/akshatXD-hash/sih-2026-website.git
cd sih-2026-website
npm ci
```

Copy `.env.example` to `.env`:
```bash
# In POSIX shells (Linux / macOS):
cp .env.example .env

# In PowerShell (Windows):
Copy-Item .env.example .env
```

Generate your `AUTH_SECRET`:
```bash
npx auth secret
```

Replace the database connection strings in `.env` with your Neon pooled and direct credentials.

### 3. Database Migration & Seeding
Apply committed migrations and seed initial schemes, sample partners, and the optional officer account:
```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

> **Tip**: To access the protected officer dashboard (`/admin`), set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (12+ characters) in `.env` before running `npm run db:seed`.

### 4. Import Location Directory (Optional for Full Offline Spatial Search)
Download and import OpenStreetMap banks and GeoNames India locations:
```powershell
# In PowerShell / pwsh:
powershell -File scripts/download-location-data.ps1
npm run db:locations
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

Kaarva includes an automated test suite with **175+ tests across 25 test suites** covering matching logic, ranking equations, financial calculations, authentication guards, and voice processing.

```bash
# Run all unit and mock-mode tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate a sample pre-sanction PDF artifact
npm run pdf:sample

# Run linter
npm run lint

# Validate production build
npm run build
```

### Optional Database Integration Tests
To run live database integration tests against your configured database:
```powershell
# Action Plan DB Integration Test
$env:TEST_ACTION_PLAN_DATABASE = '1'
npx vitest run src/__tests__/action-plan.integration.test.ts

# Location & Bank Directory Spatial Test
$env:TEST_LOCATION_DATABASE = '1'
npx vitest run src/__tests__/location-directory.integration.test.ts
```

---

## Security & Boundary Guarantees

1. **Defense-in-Depth Authorization**: Route protection in `src/proxy.ts` provides optimistic navigation redirects, while **every Server Action and Route Handler independently verifies user identity and ownership**.
2. **Server-Only Asset Delivery**: Cloudinary API secrets and storage keys are strictly isolated in server runtimes. Files are accessed via transient, signed URLs with 5-minute expirations.
3. **Database Security**: Direct and pooled connection strings mandate `sslmode=verify-full&channel_binding=require` to verify certificates and SCRAM channel binding.
4. **Input Sanitization**: All user inputs, file uploads, and AI responses are strictly validated through Zod schemas before persistence.

---

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `next dev` | Starts Next.js development server. |
| `build` | `next build` | Compiles optimized production bundle. |
| `start` | `next start` | Runs production server. |
| `lint` | `eslint` | Runs ESLint checks. |
| `test` | `vitest run` | Runs test suite. |
| `test:watch` | `vitest` | Runs Vitest in interactive watch mode. |
| `pdf:sample` | `vitest run --config vitest.pdf.config.mts` | Generates a sample pre-sanction PDF file. |
| `db:generate`| `prisma generate` | Generates the typed Prisma client. |
| `db:migrate` | `prisma migrate dev` | Runs Prisma development migrations. |
| `db:deploy`  | `prisma migrate deploy` | Applies migrations in production/staging. |
| `db:seed`    | `prisma db seed` | Seeds active schemes, sample partners, and officer accounts. |
| `db:studio`  | `prisma studio` | Opens the Prisma database GUI in your browser. |
| `db:locations`| `tsx scripts/import-location-directory.ts` | Imports OSM banks and GeoNames places into PostGIS. |

---

## Related Documentation

- [`AI_SERVICE_README.md`](./AI_SERVICE_README.md): JSON schema contracts, endpoint specifications, and integration guide for the FastAPI AI team.
- [`LOCATION_DIRECTORY.md`](./LOCATION_DIRECTORY.md): Details on GeoNames dataset, OpenStreetMap bank ingestion, spatial indexing, and place resolution.
- [`IMPLEMENTATION_PHASES.md`](./IMPLEMENTATION_PHASES.md): Technical implementation roadmap and review checkpoints.
- [`docs/explainable-matching-and-action-plan.md`](./docs/explainable-matching-and-action-plan.md): Specification on rule explainability, fallback handling, and applicant competency tracking.
- [`AGENTS.md`](./AGENTS.md): Repository-specific guidance and rules for coding agents.

---

<div align="center">
  <sub>Built with precision for the Smart India Hackathon (SIH 2026).</sub>
</div>
