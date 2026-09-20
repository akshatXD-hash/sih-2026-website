# Kaarva — Intelligent Public Credit & Scheme Matching Platform

> **Public Credit, Decoded.**  
> *“AI assists. Rules decide.”*

Kaarva is a production-grade public credit scheme discovery, matching, and application enablement platform built for the Smart India Hackathon (SIH 2026). It bridges the critical gap between grassroots citizens seeking microfinance, term credit, or educational loans and public lending institutions.

The platform combines **deterministic, explainable rule matching**, **PostGIS geospatial bank directory intelligence**, **multilingual voice-to-intent extraction (Groq Whisper & Gemini 2.5 Flash)**, **omnichannel WhatsApp & Twilio conversational bot integration**, **multimodal certificate OCR verification**, **grounded policy advisory**, and an **audited administrative review state machine**.

---

## Table of Contents

- [1. Core Philosophy & Architectural Principles](#1-core-philosophy--architectural-principles)
- [2. System Architecture & High-Level Flow](#2-system-architecture--high-level-flow)
- [3. Deep Dive: AI/ML Microservice Integration](#3-deep-dive-aiml-microservice-integration)
  - [Architecture & Tech Stack](#architecture--tech-stack)
  - [Microservice Endpoints & Data Contracts](#microservice-endpoints--data-contracts)
  - [Safe Normalization & Boundary Guarantees](#safe-normalization--boundary-guarantees)
  - [Mock vs. Remote Mode](#mock-vs-remote-mode)
- [4. Complete User Journey & Route Map](#4-complete-user-journey--route-map)
- [5. Platform Core Modules](#5-platform-core-modules)
  - [5.1 Multilingual Voice & Intent Extraction](#51-multilingual-voice--intent-extraction)
  - [5.2 Explainable Deterministic Matching Engine](#52-explainable-deterministic-matching-engine)
  - [5.3 PostGIS Geospatial Branch Directory & Composite Ranking](#53-postgis-geospatial-branch-directory--composite-ranking)
  - [5.4 Dynamic Action Plan & Skill Readiness Checklist](#54-dynamic-action-plan--skill-readiness-checklist)
  - [5.5 Financial Amortization & Provisional Pre-Sanction PDF](#55-financial-amortization--provisional-pre-sanction-pdf)
  - [5.6 Multimodal Document OCR & Cloudinary Vault](#56-multimodal-document-ocr--cloudinary-vault)
  - [5.7 Administrative Officer Dashboard & Audit State Machine](#57-administrative-officer-dashboard--audit-state-machine)
  - [5.8 Omnichannel WhatsApp & Twilio Bot Integration](#58-omnichannel-whatsapp--twilio-bot-integration)
- [6. Supported Schemes Catalog](#6-supported-schemes-catalog)
- [7. Technology Stack Overview](#7-technology-stack-overview)
- [8. Database Models & PostGIS Integration](#8-database-models--postgis-integration)
- [9. Environment Configuration](#9-environment-configuration)
- [10. Getting Started & Local Setup](#10-getting-started--local-setup)
- [11. Testing, Quality Assurance & Benchmarks](#11-testing-quality-assurance--benchmarks)
- [12. Security, Privacy & Boundary Guarantees](#12-security-privacy--boundary-guarantees)
- [13. Available Scripts](#13-available-scripts)
- [14. Related Documentation](#14-related-documentation)

---

## 1. Core Philosophy & Architectural Principles
 
 ```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                               1. BENEFICIARY / CSC AGENT                               │
 │      • Audio Stream (11+ Indic Languages) ────► Groq Whisper STT (Large v3 Turbo)      │
 │      • Conversational Language Queries    ────► NLP Intent & Jargon Simplifier         │
 │      • WhatsApp Voice & Text Notes (Twilio / Meta API) ──► Auto Scheme Intake          │
 │      • Scanned PDF / Image Certificates   ────► Multimodal Gemini Vision OCR           │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Extracted Facts (JSON)
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                2. DETERMINISTIC CORE                                   │
 │      • 100% Explainable Rule Evaluation (Met / Unmet / Missing Breakdown)              │
 │      • PostGIS Spatial Branch Locator & Bank Ranking (Distance, Quota, NPA%)           │
 │      • Financial Amortization Engine & Provisional Pre-Sanction PDF Generation         │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                             3. AUDITED OFFICER WORKFLOW                                │
 │      • Side-by-Side OCR Evidence & Original Document Review                            │
 │      • 90-Day Branch Scheme Support Verification with HTTPS URLs                       │
 │      • Strict Application State Machine (DRAFT ──► REVIEW ──► APPROVED / DISBURSED)    │
 └────────────────────────────────────────────────────────────────────────────────────────┘
 ```
 
 1. **AI Assists, Rules Decide**: AI models extract structured intents from natural language, transcribe audio in regional dialects, simplify complex policy jargon, and perform multimodal OCR on certificates. AI **never** makes eligibility decisions, calculates sanction amounts, or overrides deterministic policy criteria.
 2. **Human in the Loop**: All AI-extracted fields (profile info, OCR annual income, caste categories) require explicit applicant confirmation before being saved to the database. Gender is never inferred from names or photos.
 3. **Auditability & Zero Hallucination**: Every status progression, officer verification note, and branch quota confirmation is attributed to a verified user with timestamped event logging. Scheme eligibility criteria are 100% transparent and traceable to official government gazettes.
 
 ---
 
 ## 2. System Architecture & High-Level Flow
 
 Kaarva adopts a decoupled microservice architecture:
 
 ```
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │ NEXT.JS 16 FULLSTACK APPLICATION (Vercel / Node.js)                                     │
 │                                                                                         │
 │  ┌─────────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐  │
 │  │   Applicant Wizard UI   │   │  Spatial Leaflet Maps   │   │ Officer Review Portal │  │
 │  │   (/eligibility, /app)  │   │  (/branches)            │   │ (/admin)              │  │
 │  └────────────┬────────────┘   └────────────┬────────────┘   └───────────┬───────────┘  │
 │               │                             │                            │              │
 │  ┌────────────▼─────────────────────────────▼────────────────────────────▼───────────┐  │
 │  │ TypeScript Gateway Layer (src/lib/ai-service/client.ts & src/lib/matching.ts)     │  │
 │  │ • Zod-validated Schemas   • Deterministic Matching Engine  • pdf-lib Builder      │  │
 │  │ • WhatsApp / Twilio Webhooks (/api/webhooks/twilio-whatsapp, /api/webhooks/whatsapp)│
 │  └────────────┬─────────────────────────────┬────────────────────────────┬───────────┘  │
 └───────────────┼─────────────────────────────┼────────────────────────────┼──────────────┘
                 │ REST (Zod Contracts)        │ SQL / PostGIS Queries      │ Signed URLs
                 ▼                             ▼                            ▼
 ┌───────────────────────────────┐ ┌─────────────────────────┐ ┌────────────────────────┐
 │ FASTAPI AI/ML MICROSERVICE    │ │ POSTGRESQL + POSTGIS    │ │ CLOUDINARY VAULT       │
 │ (Render / Docker Container)   │ │ (Neon Serverless)       │ │ (Authenticated Media)  │
 │                               │ │                         │ │                        │
 │ • Google Gemini 2.5 Flash     │ │ • 21,000+ OSM Banks     │ │ • 5-min Short-Lived    │
 │ • PyMuPDF (fitz) OCR Engine   │ │ • 162,000+ Place Nodes  │ │   Signed URLs          │
 │ • 75+ Policy Document RAG     │ │ • Spatial GiST Indexes  │ │ • Zero Public Storage  │
 │ • Pydantic v2 Strict Schemas  │ │ • Audited State Machine │ │   for Identity Proofs  │
 └───────────────────────────────┘ └─────────────────────────┘ └────────────────────────┘
```

---

## 3. Deep Dive: AI/ML Microservice Integration

The AI/ML capabilities are encapsulated in an asynchronous, stateless Python FastAPI microservice (`SIH-26-AI-ML`) and integrated cleanly into Next.js through a strongly-typed adapter boundary (`src/lib/ai-service/`).

### Architecture & Tech Stack
* **Language & Runtime:** Python 3.11, Uvicorn, Asynchronous FastAPI.
* **LLM Engine:** [Google Gemini 2.5 Flash](https://ai.google.dev/) using the `google-genai` SDK (v1.0.0) with Pydantic v2 `response_schema` enforcement.
* **Speech-to-Text:** Groq Whisper (`whisper-large-v3-turbo`) with regional language fallback.
* **Vision & PDF Ingestion:** PyMuPDF (`fitz`) page renderer + Pillow (PIL) image normalization.
* **Deployment:** Containerized with Docker (<250MB RAM footprint), hosted on Render with automated keep-alive health pings.

---

### Microservice Endpoints & Data Contracts

| Method & Route | Fullstack Adapter Method | Purpose & Model Flow |
| :--- | :--- | :--- |
| `GET /health` | `health()` | Verifies service availability, memory status, and API health. |
| `POST /extract-applicant-intent` | `extractApplicantIntent()` | Extracts structured financial parameters from regional voice transcripts. |
| `POST /ocr-certificate` | `ocrCertificate()` | Multipart OCR extracting certificate ID, income, and validity from PDFs/images. |
| `POST /simplify-term` | `simplifyTerm()` | Explains bureaucratic banking jargon using colloquial vernacular analogies. |
| `POST /recommend-scheme-explainer` | `explainRecommendation()` | Generates tailored comparative rationale for eligible scheme candidates. |
| `POST /scheme-chat` | `chat()` | Policy-grounded 2-tier conversational Q&A over 75+ official government guidelines. |

---

### Endpoint Specifications & Payloads

#### 1. Structured Intent Extraction (`POST /extract-applicant-intent`)
Extracts financial requirements and applicant facts from conversational speech transcripts or free-text descriptions.
```json
// Request Payload
{
  "transcript": "मैं एक महिला दर्जी हूँ, मुझे नई सिलाई मशीन के लिए ₹50,000 का लोन चाहिए।",
  "language": "hi"
}

// Response Payload (Pydantic v2 Enforced)
{
  "project_category": "Manufacturing",
  "requested_amount": 50000,
  "annual_income": 120000,
  "trade": "tailoring",
  "gender": "Female",
  "confidence": 0.94
}
```

#### 2. Multimodal Certificate OCR (`POST /ocr-certificate`)
Sends `multipart/form-data` containing the uploaded certificate (`caste` or `income`). PyMuPDF renders pages to high-resolution images, and Gemini Vision extracts structured fields and validates income thresholds.
```json
// Response Payload
{
  "doc_type": "income",
  "extracted_fields": {
    "name": "Sunita Devi",
    "category": "OBC",
    "annual_income": 140000,
    "valid_until": "2027-03-31"
  },
  "income_verified": true,
  "raw_confidence": 0.92
}
```

#### 3. Jargon Simplifier (`POST /simplify-term`)
Translates complex banking terms (e.g., *Moratorium Period*, *Margin Money*, *Collateral*) into plain English or Hindi.
```json
// Request: { "term": "Moratorium Period", "language": "hi" }
// Response:
{
  "explanation": "मोरेटोरियम का मतलब है 'कर्ज चुकाने की शुरुआती छूट की अवधि'। जैसे नया कारोबार शुरू करने के बाद पहले 6 महीने आपको केवल काम जमाने पर ध्यान देना है, किस्त (EMI) 6 महीने बाद शुरू होगी।"
}
```

#### 4. Grounded Policy Advisory (`POST /scheme-chat`)
Two-tier grounded RAG over 75+ official government scheme documents (PMEGP, PM Vishwakarma, MUDRA, Stand-Up India, NBCFDC, NSFDC).
```json
// Request: { "message": "PMEGP में मुझे कितनी सब्सिडी मिल सकती है?", "language": "hi" }
// Response:
{
  "response": "PMEGP योजना के तहत ग्रामीण क्षेत्रों में विशेष वर्ग (महिला/SC/ST/OBC) के लिए 35% तक और शहरी क्षेत्रों में 25% तक मार्जिन मनी सब्सिडी मिलती है।",
  "suggested_questions": [
    "PMEGP के लिए कौन से दस्तावेज चाहिए?",
    "सब्सिडी बैंक खाते में कब लॉक-इन होती है?",
    "PMEGP और MUDRA में क्या अंतर है?"
  ]
}
```

---

### Safe Normalization & Boundary Guarantees

To ensure rock-solid data integrity and eliminate AI bias:
1. **Category Mapping:** Maps arbitrary AI text outputs strictly to canonical database categories:
   - `Manufacturing` $\rightarrow$ `manufacturing`
   - `Service` $\rightarrow$ `services`
   - `Trading` $\rightarrow$ `trading`
2. **Zero-to-Null Coercion:** If the model returns `0` for missing amounts, the adapter coerces it to `null` with a warning rather than storing invalid financial figures.
3. **Gender Confirmation Safeguard:** AI models are never allowed to persist an applicant's `gender` directly. The adapter sets `gender: null`, populates `suggested_gender`, and triggers `requires_gender_confirmation: true`. The applicant must explicitly confirm their gender.
4. **Zero Upstream Error Exposure:** Upstream AI microservice exceptions or raw prompt errors are sanitized at the TypeScript boundary and never leaked to the client browser.

---

### Mock vs. Remote Mode

Kaarva can operate completely offline with rich deterministic fixtures, or connect to the live FastAPI cloud service:

```env
# Offline local development & automated unit tests
AI_SERVICE_MODE="mock"

# Live integration with deployed FastAPI microservice
AI_SERVICE_MODE="remote"
AI_SERVICE_URL="https://sih-26-ai-ml.onrender.com"
AI_SERVICE_TIMEOUT_MS="30000"
```

---

## 4. Complete User Journey & Route Map

| Route | Access Role | Description & Available Actions |
| :--- | :--- | :--- |
| `/` | Public | Landing page presenting the 4-step journey, trust boundaries, and platform stats. |
| `/register`, `/login` | Public | Credentials authentication with Auth.js (NextAuth v5 beta) and role assignment. |
| `/eligibility` | `APPLICANT` | 2-step profile wizard with multilingual voice auto-fill and NLP intent extraction. |
| `/eligibility/[id]/finance` | `APPLICANT` | Financial requirements form (project category, required loan amount, annual income). |
| `/schemes` | `APPLICANT` | Scheme discovery with **Why?** explainability breakdown, criteria matching, and AI comparison. |
| `/branches` | `APPLICANT` | Interactive PostGIS Leaflet map searching 21k+ banks and ranking by distance, quota, and NPA%. |
| `/applications/[id]/profile`| `APPLICANT` | Review and update draft answers (clears earlier partner selection to ensure consistent matching). |
| `/applications/new` | `APPLICANT` | Application creation combining selected scheme, preferred branch, and uploaded documents. |
| `/applications/[id]` | `APPLICANT` | Central hub: skill readiness action plan, EMI simulator, and provisional pre-sanction PDF download. |
| `/assistant` | `APPLICANT` | Bounded conversational Q&A assistant explaining scheme terms, eligibility rules, and subsidies. |
| `/admin` | `ADMIN`, `REVIEWER` | Officer dashboard for lead triage, status progression, internal notes, and AI service health monitor. |
| `/admin/applications/[id]` | `ADMIN`, `REVIEWER` | Detailed officer review page: document verification, private notes, status state machine. |
| `/admin/branch-support` | `ADMIN`, `REVIEWER` | Audit tool to search bank branches and record 90-day verified scheme confirmations with HTTPS links. |
| `/api/applications/[id]/pre-sanction-pdf` | `APPLICANT` | Protected Route Handler streaming generated binary pre-sanction PDF documents. |
| `/api/voice/auto-fill` | `APPLICANT` | Multilingual speech-to-text + structured intent extraction pipeline. |
| `/api/webhooks/twilio-whatsapp` | Public Webhook | Inbound Twilio WhatsApp webhook (voice note & text processing, TwiML response, REST fallback). |
| `/api/webhooks/whatsapp` | Public Webhook | Meta WhatsApp Cloud API webhook (`hub.challenge` verification & event handling). |
| `/api/whatsapp/simulate` | `APPLICANT`, Public | Test endpoint simulating incoming WhatsApp text or voice messages with vernacular matching replies. |

---

## 5. Platform Core Modules

### 5.1 Multilingual Voice & Intent Extraction
* **Groq Whisper Large v3 Turbo:** Ultra-low latency voice transcription supporting 11 Indic languages (Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu, English).
* **Silence & Hallucination Suppression:** Automatically detects empty voice recordings or audio silence, preventing LLM phantom transcripts.
* **Reviewable Form Pre-fill:** Transcribed intents immediately pre-fill eligibility fields in draft state for visual review before submission.

### 5.2 Explainable Deterministic Matching Engine
* **Rule Matcher (`src/lib/matching.ts`):** Evaluates profile facts against official scheme bounds:
  - Age boundaries (min/max limits).
  - Annual income thresholds and EWS limits.
  - Project category support (Manufacturing, Services, Trading).
  - Target demographics (Women, SC, ST, OBC, Minority, General).
  - Loan amount brackets (min/max limits) and collateral ceilings.
* **Transparent "Why?" Breakdown:** Every scheme displays an expandable audit card detailing:
  - 🟢 **Rules Met:** Criteria satisfied by applicant facts.
  - 🔴 **Rules Failed:** Criteria violated with clear explanations and official citations.
  - 🟡 **Missing Information:** Information required to complete qualification.

### 5.3 PostGIS Geospatial Branch Directory & Composite Ranking
* **Spatial PostGIS Radius Search (`ST_DWithin`):** Rapid geographical radius queries over 21,000+ OpenStreetMap Indian bank branches and 162,000+ GeoNames localities.
* **Composite Branch Scoring Algorithm:**
  $$\text{Score} = w_d \cdot (1 - \text{NormDistance}) + w_q \cdot \text{QuotaAvailability} + w_n \cdot (1 - \text{NPARate})$$
* **Smart Rural Fallbacks:** Automatic 100 km radius expansion for remote/rural postal codes, twin-city alias normalization (Hubballi–Dharwad, Bengaluru/Bangalore), and multi-village PIN code disambiguation.

### 5.4 Dynamic Action Plan & Skill Readiness Checklist
* **Contextual Milestones:** Generates tailored preparation checklists based on chosen scheme requirements (e.g., Quotation collection, Udyam Registration, Project Report drafting).
* **Interactive Competency Modules:** Built-in exercises for unit cost calculation, cashbook bookkeeping, and local market assessment.
* **Ethical Readiness Design:** Skill exercises help applicants prepare for bank interviews without gating loan submission or simulating fake approval scores.

### 5.5 Financial Amortization & Provisional Pre-Sanction PDF
* **Exact Mathematical Amortization (`src/lib/finance.ts`):**
  - Standard Equated Monthly Installment (EMI) calculations:
    $$\text{EMI} = \frac{P \cdot r \cdot (1+r)^n}{(1+r)^n - 1}$$
  - Moratorium grace period interest capitalization.
  - Special affirmative interest rate concessions (e.g., 0.5% – 1% rebate for women entrepreneurs).
* **Provisional Pre-Sanction Letter (`src/lib/pre-sanction-pdf.ts`):** Server-rendered PDF generated using `pdf-lib` containing applicant profile, selected scheme parameters, subsidy breakdown, estimated EMI, and clear provisional disclaimers.

### 5.6 Multimodal Document OCR & Cloudinary Vault
* **Supported Documents:** `AADHAAR`, `PAN`, `CASTE_CERTIFICATE`, `INCOME_PROOF`, `BANK_STATEMENT`, `PROJECT_REPORT`, `EDUCATION_CERTIFICATE`, `ADMISSION_LETTER`, `FEE_STRUCTURE`.
* **Zero Client-Secret Exposure:** Strict server-side MIME type verification and file size caps (5MB). Uploaded directly to Cloudinary in authenticated delivery mode.
* **Side-by-Side Review:** Officers view the original document alongside the AI-extracted fields, validity dates, and income verification flags.

### 5.7 Administrative Officer Dashboard & Audit State Machine
* **Role-Based Access Control:** `ADMIN`, `CHANNEL_PARTNER`, `REVIEWER`, and `APPLICANT`.
* **Formal State Transitions:**
  $$\text{DRAFT} \longrightarrow \text{EXTRACTION\_PENDING} \longrightarrow \text{EXTRACTION\_COMPLETE} \longrightarrow \text{SUBMITTED} \longrightarrow \text{UNDER\_REVIEW} \longrightarrow \begin{cases} \text{APPROVED} \longrightarrow \text{DISBURSED} \\ \text{REJECTED} \\ \text{WITHDRAWN} \end{cases}$$
* **90-Day Branch Support Auditing:** Reviewing officers audit bank branch scheme capabilities and log confirmations with HTTPS evidence URLs, automatically expiring after 90 days to prevent stale routing.

### 5.8 Omnichannel WhatsApp & Twilio Bot Integration
* **Dual Ingress Webhooks:**
  - **Twilio WhatsApp (`/api/webhooks/twilio-whatsapp`):** Processes incoming WhatsApp voice and text messages from Twilio numbers, downloads media recordings, and responds dynamically via TwiML XML and Twilio REST API fallback.
  - **Meta WhatsApp Cloud API (`/api/webhooks/whatsapp`):** Handles Meta verification handshakes (`hub.challenge`) and parses incoming message batches, media IDs, and status receipts.
* **Grassroots Voice Note Processing:** Automatically downloads audio voice notes (`.ogg`, `.opus`, `.mp4`), transcribes them with Groq Whisper across regional Indic languages (Hindi, Kannada, Marathi, Tamil, etc.), and extracts structured loan requirements.
* **Deterministic Matching on WhatsApp:** Feeds extracted parameters directly into the deterministic matching engine and crafts a culturally tailored, vernacular reply containing the best-fit scheme, subsidy estimates, and nearby participating banks.
* **Seamless Web Onboarding:** Sends direct deep-links (`/register?source=whatsapp&trade=...&amount=...`) to transition grassroots applicants seamlessly from WhatsApp chat to the pre-filled web application wizard.
* **Test Simulation API (`/api/whatsapp/simulate`):** Dedicated route allowing offline demonstration and automated testing of WhatsApp flows without active third-party carrier credits.

---

## 6. Supported Schemes Catalog

Kaarva catalogues active schemes across three core public credit pillars:

### 1. Micro Finance (`MICRO_FINANCE`)
* **PM SVANidhi:** Working capital micro-credit for urban street vendors with digital transaction cashback.
* **PM MUDRA Yojana (Shishu):** Uncollateralized loans up to ₹50,000 for early-stage micro-enterprises.
* **PM Vishwakarma:** Financial support, toolkits, and collateral-free enterprise credit for traditional artisans.
* **National Scheduled Castes Finance (NSFDC):** Targeted concessional micro-credit for marginalized beneficiaries.

### 2. Term Loans (`TERM_LOAN`)
* **Prime Minister Employment Generation Programme (PMEGP):** Credit-linked capital subsidy for manufacturing (up to ₹50L) and service (up to ₹20L) setups.
* **Stand-Up India:** Bank loans between ₹10 Lakhs and ₹1 Crore for SC/ST and women entrepreneurs for greenfield enterprises.
* **MUDRA (Kishore & Tarun):** Scaled growth funding up to ₹10 Lakhs for established enterprises.
* **Credit Guarantee Scheme for Micro & Small Enterprises (CGTMSE):** Collateral-free credit support.

### 3. Education Loans (`EDUCATION_LOAN`)
* **Central Sector Interest Subsidy (CSIS):** Full interest subsidy during moratorium period for EWS students.
* **Padho Pardesh:** Subsidized education loans for overseas studies for minority community students.
* **Dr. Ambedkar Central Sector Scheme:** Interest subsidy on educational loans for overseas studies for OBC/EBC students.
* **SBI Student / Skill Loan Scheme:** Specialized vocational and higher education loan facilities.

---

## 7. Technology Stack Overview

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.2 (App Router) | React Server Components, Server Actions, API Route Handlers |
| **UI & Styling** | React 19, Tailwind CSS v4 | Accessible responsive UI, Leaflet interactive maps, toast feedback |
| **Database & ORM** | PostgreSQL (Neon), Prisma ORM 7.10 | Serverless Postgres, `@prisma/adapter-pg`, relational schemas |
| **Geospatial Engine** | PostGIS Extension | Spatial `ST_DWithin` radius search, GiST indexes over 21k+ banks |
| **AI / ML Backend** | FastAPI, Python 3.11, Pydantic v2 | Microservice for intent extraction, certificate OCR, 2-tier RAG |
| **LLM & Vision** | Google Gemini 2.5 Flash | Multimodal certificate OCR, conversational RAG, term simplifier |
| **Speech-to-Text** | Groq Whisper (`whisper-large-v3-turbo`) | High-speed multilingual voice transcription in 11+ Indic languages |
| **Document Processing**| PyMuPDF (`fitz`), Pillow (PIL) | PDF page rendering and image pre-processing for Vision OCR |
| **Messaging & Channels** | Twilio Programmable Messaging & WhatsApp Cloud API | Omnichannel voice note & text scheme intake, TwiML, and Graph API responses |
| **Storage & Media** | Cloudinary SDK | Authenticated document storage with short-lived 5-minute signed URLs |
| **PDF Generation** | `pdf-lib` | Server-rendered binary provisional pre-sanction PDF documents |
| **Authentication** | Auth.js (NextAuth v5 beta), bcryptjs | Role-based session authorization, Server Action guards |
| **Testing** | Vitest 4.1.11 | Fast unit and integration tests (26 test suites, 200+ tests) |

---

## 8. Database Models & PostGIS Integration

The PostgreSQL database leverages the **PostGIS extension** for spatial operations.

```
┌─────────────────┐       1:N       ┌─────────────────────┐
│      User       ├─────────────────┤     Application     │
│ (Roles: ADMIN,  │                 │ (Status, Facts,     │
│  APPLICANT...)  │                 │  Audit State)       │
└────────┬────────┘                 └──────────┬──────────┘
         │                                     │
         │ 1:N                                 │ 1:N
┌────────▼────────┐                 ┌──────────▼──────────┐
│ DocumentUpload  │                 │   ApplicationTask   │
│ (Cloudinary URL,│                 │ (Dynamic Checklist  │
│  OCR metadata)  │                 │  & Milestones)      │
└─────────────────┘                 └─────────────────────┘
                                               │
┌─────────────────┐       1:N       ┌──────────▼──────────┐
│   LoanScheme    ├─────────────────┤ BranchSchemeSupport │
│ (Rules, Income, │                 │ (Audited 90-day     │
│  Age, Subsidies)│                 │  Officer Proof)     │
└─────────────────┘                 └──────────┬──────────┘
                                               │
┌─────────────────┐                 ┌──────────▼──────────┐
│   SearchPlace   │                 │   BankDirectory     │
│ (162k+ PinCodes,│                 │ (21k+ OSM Banks,    │
│  GiST Spatial)  │                 │  PostGIS Geography) │
└─────────────────┘                 └─────────────────────┘
```

### Spatial Tables & GiST Indexing
* `bank_directory.location` and `channel_partners.location` are stored as `geography(Point, 4326)`.
* PostGIS spatial indexes (`GiST`) accelerate radius queries to sub-10ms response times across 21,000+ branches.
* Trigram (`pg_trgm`) and GIN indexes power fuzzy village, city, and PIN code search.

---

## 9. Environment Configuration

Create a `.env` file in the root directory modeled after `.env.example`:

```env
# ==========================================
# Database Connection (Neon PostgreSQL + PostGIS)
# ==========================================
DATABASE_URL="postgresql://user:pass@ep-cool-pooler.region.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
DIRECT_URL="postgresql://user:pass@ep-cool.region.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
SHADOW_DATABASE_URL="postgresql://user:pass@ep-shadow.region.neon.tech/neondb?sslmode=verify-full&channel_binding=require"

# ==========================================
# AI / ML Microservice Integration
# ==========================================
AI_SERVICE_MODE="remote"                     # "mock" for offline tests, "remote" for live FastAPI
AI_SERVICE_URL="https://sih-26-ai-ml.onrender.com"
AI_SERVICE_TIMEOUT_MS="30000"

# ==========================================
# Speech-to-Text (Groq Whisper)
# ==========================================
GROQ_API_KEY="gsk_..."

# ==========================================
# WhatsApp & Twilio Messaging Integration
# ==========================================
# Twilio WhatsApp Webhook & API
TWILIO_ACCOUNT_SID="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="whatsapp:+17372508034"

# Meta WhatsApp Cloud API (Graph API)
WHATSAPP_API_TOKEN="EAA..."
WHATSAPP_PHONE_NUMBER_ID="your-whatsapp-phone-id"
WHATSAPP_VERIFY_TOKEN="kaarva_sih_2026_verify_token"

# ==========================================
# Document Storage (Cloudinary Vault)
# ==========================================
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# ==========================================
# Authentication & Security (Auth.js / NextAuth v5)
# ==========================================
AUTH_SECRET="your-32-byte-secret"            # Generate with `npx auth secret`
AUTH_TRUST_HOST="true"

# ==========================================
# Optional Admin / Officer Seed Credentials
# ==========================================
SEED_ADMIN_EMAIL="officer@kaarva.gov.in"
SEED_ADMIN_PASSWORD="StrongOfficerPassword123!"
```

---

## 10. Getting Started & Local Setup

### 1. Prerequisites
* **Node.js:** `22.12+` or `24+` with `npm` (v10+).
* **Python (Optional for local AI service):** `3.11+` with `pip`.
* **PostgreSQL:** Neon database instance with PostGIS enabled.

### 2. Installation
```bash
git clone https://github.com/akshatXD-hash/sih-2026-website.git
cd sih-2026-website
npm ci
```

### 3. Environment & Database Setup
```bash
# Copy environment file
cp .env.example .env

# Generate NextAuth Secret
npx auth secret

# Generate Prisma Client & Run Database Migrations
npm run db:generate
npm run db:deploy
npm run db:seed
```

### 4. Location Directory Import (Optional for Full Offline Spatial Search)
```powershell
# Fetch OpenStreetMap banks and GeoNames India data
powershell -File scripts/download-location-data.ps1

# Upsert 162k places and 21k bank branches into PostGIS
npm run db:locations
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 11. Testing, Quality Assurance & Benchmarks

Kaarva includes an automated test suite comprising **175+ tests across 25 test suites** covering matching logic, ranking equations, financial calculations, authentication guards, and AI adapter contracts:

```bash
# Run all unit and mock-mode integration tests
npm test

# Run tests in interactive watch mode
npm run test:watch

# Generate a sample provisional pre-sanction PDF artifact
npm run pdf:sample

# Run ESLint validation
npm run lint

# Validate full production build
npm run build
```

---

## 12. Security, Privacy & Boundary Guarantees

1. **Defense-in-Depth Authorization:** Route protection in `src/proxy.ts` handles navigation redirects, while **every Server Action and Route Handler independently verifies user identity and record ownership**.
2. **Server-Only Media Security:** Cloudinary API secrets are strictly isolated on the server. Documents are retrieved exclusively via transient, 5-minute signed download URLs.
3. **Strict Zero-PII AI Logging:** Chat and intent extraction payloads strip personally identifiable information (PII) before calling external models. Prompts and transcripts are never logged to public monitoring tools.
4. **Hard-Coded Policy Authority:** AI outputs are validated against strict Zod/Pydantic contracts; financial calculations and scheme approvals remain 100% deterministic.

---

## 13. Available Scripts

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

## 14. Related Documentation

- [`AI_SERVICE_README.md`](./AI_SERVICE_README.md): JSON schema contracts, endpoint specifications, and integration guide for the FastAPI AI team.
- [`LOCATION_DIRECTORY.md`](./LOCATION_DIRECTORY.md): Details on GeoNames dataset, OpenStreetMap bank ingestion, spatial indexing, and place resolution.
- [`IMPLEMENTATION_PHASES.md`](./IMPLEMENTATION_PHASES.md): Technical implementation roadmap and review checkpoints.
- [`docs/explainable-matching-and-action-plan.md`](./docs/explainable-matching-and-action-plan.md): Specification on rule explainability, fallback handling, and applicant competency tracking.
- [`AGENTS.md`](./AGENTS.md): Repository-specific guidance and rules for coding agents.

---

<div align="center">
  <sub>Built with precision for the Smart India Hackathon (SIH 2026).</sub>
</div>

