# AI Service Handoff Guide

This guide is for the team building the **external FastAPI AI/ML service** for
the SIH Scheme Matching Platform.

The AI service is a separate deployment. It must return structured JSON to the
Next.js application; it must not import Prisma, connect directly to Neon, or
write application records itself.

## 1. System boundary

```text
Browser
   |
   v
Next.js fullstack service  ----->  FastAPI AI service
   |                               - document extraction
   |                               - normalization
   |                               - optional scheme ranking
   |                                      |
   |<------------- JSON only -------------+
   |
   v
Prisma Client  ->  Neon PostgreSQL/PostGIS
```

The Next.js service owns:

- authentication and authorization;
- document storage and signed download URLs;
- Prisma and Neon credentials;
- application status transitions;
- validation of the AI response;
- all database reads and writes;
- final eligibility decisions and audit history.

The AI service owns:

- extracting supported fields from applicant documents or text;
- normalizing those fields to this contract;
- returning confidence, evidence references, and warnings;
- optionally ranking a scheme catalog supplied by Next.js.

## 2. Source-of-truth files

Read these files before changing the AI contract:

- [`prisma/schema.prisma`](./prisma/schema.prisma) defines the database models,
  enums, relations, and field precision.
- [`prisma/seed.ts`](./prisma/seed.ts) contains the current development scheme
  vocabulary and representative eligibility data.
- [`.env.example`](./.env.example) documents `AI_SERVICE_URL`. The AI service
  must not receive `DATABASE_URL` or `DIRECT_URL`.

Do not import anything from `src/generated/prisma` into Python. That directory
is generated TypeScript for the Next.js application and is not a cross-service
API contract.

## 3. Prisma fields the AI service feeds

The primary AI destination is the `Application` model. Prisma uses camelCase
inside TypeScript, while the database and AI JSON use snake_case.

| AI response key | Prisma Client field | Database column | Type and rule |
| --- | --- | --- | --- |
| `project_category` | `projectCategory` | `project_category` | Canonical lowercase slug or `null` |
| `requested_amount` | `requestedAmount` | `requested_amount` | INR amount, non-negative, at most 2 decimals, or `null` |
| `annual_income` | `annualIncome` | `annual_income` | Annual INR amount, non-negative, at most 2 decimals, or `null` |
| `trade` | `trade` | `trade` | Canonical lowercase trade label or `null` |
| `gender` | `gender` | `gender` | Exact `Gender` enum value or `null` |
| `service_version` | `aiServiceVersion` | `ai_service_version` | Deploy/model contract version |
| `processed_at` | `aiProcessedAt` | `ai_processed_at` | ISO 8601 UTC timestamp |
| `confidence.overall` | `aiConfidence` | `ai_confidence` | Decimal from `0.0000` to `1.0000` |
| Complete response | `aiOutput` | `ai_output` | Original validated JSON for traceability |

Per-document OCR or extraction may also be stored by Next.js in
`DocumentUpload.extractedData`. The AI service should return the data; it should
not decide which database row to update.

### Important distinction

`LoanScheme.category` is the **loan product type** and accepts only:

- `MICRO_FINANCE`
- `TERM_LOAN`
- `EDUCATION_LOAN`

`Application.project_category` describes the applicant's project or education
need, such as `manufacturing` or `higher-education-india`. These two fields are
not interchangeable.

## 4. Required extraction endpoint

Recommended endpoint:

```http
POST /v1/extract
Content-Type: application/json
X-AI-Contract-Version: 1
```

### Request

```json
{
  "request_id": "01JEXAMPLE8Y3R2A9K7M6P4Q",
  "application_id": "cm123example",
  "locale": "en-IN",
  "documents": [
    {
      "document_id": "cm456example",
      "document_type": "PROJECT_REPORT",
      "content_type": "application/pdf",
      "signed_url": "https://storage.example/signed-short-lived-url",
      "checksum": "sha256:..."
    }
  ]
}
```

Rules:

- `request_id` is the idempotency and tracing key. Return it unchanged.
- `application_id` and `document_id` are opaque identifiers. Do not parse or
  generate replacements for them.
- `document_type` uses the `DocumentType` enum from `schema.prisma`.
- A signed URL must be short-lived and read-only. Download it only for this
  request and delete temporary content after processing.
- The contract may later allow pre-extracted text instead of `signed_url`, but
  that must be versioned rather than added silently.

### Successful response

```json
{
  "request_id": "01JEXAMPLE8Y3R2A9K7M6P4Q",
  "service_version": "scheme-ai-0.1.0",
  "model_version": "extractor-2026-08-25",
  "processed_at": "2026-08-25T14:30:00Z",
  "result": {
    "project_category": "micro-enterprise",
    "requested_amount": 140000.00,
    "annual_income": 240000.00,
    "trade": "tailoring",
    "gender": "FEMALE"
  },
  "confidence": {
    "overall": 0.91,
    "project_category": 0.88,
    "requested_amount": 0.98,
    "annual_income": 0.84,
    "trade": 0.92,
    "gender": 0.96
  },
  "evidence": {
    "requested_amount": [
      {
        "document_id": "cm456example",
        "page": 3,
        "text": "Total project finance requested: INR 1,40,000"
      }
    ]
  },
  "warnings": []
}
```

### Extraction rules

- Use JSON `null` when a value is absent, ambiguous, or unsupported. Never
  invent a value to complete the object.
- Currency values are Indian rupees, not paise. Do not include `₹`, `INR`,
  commas, or strings in numeric fields.
- Convert monthly income to annual income only when the source clearly labels
  it as monthly. Add a warning describing the conversion.
- Do not infer gender from a name, photograph, voice, occupation, or writing
  style. Return a gender only when the applicant explicitly supplied it.
- When documents conflict, return the best-supported value, reduce confidence,
  and add a warning containing document references—not hidden chain-of-thought.
- Evidence must be a short source excerpt or page/region reference. Do not
  return internal reasoning or model chain-of-thought.
- Confidence values must be finite numbers between `0` and `1` inclusive.

## 5. Canonical values

The development seed currently contains these project categories:

```text
micro-enterprise
agriculture-allied
livelihood
manufacturing
services
trading
higher-education-india
vocational-education
higher-education-abroad
```

Example trade labels currently include:

```text
tailoring
handicrafts
dairy
food processing
street vending
repair services
retail
transport
artisan
agro processing
textiles
wood products
engineering works
recycling
```

These lists will evolve. Do not permanently hardcode them into a trained model
or service release. The fullstack service should provide the current vocabulary
in configuration or in the matching request.

The only valid gender values are:

```text
FEMALE
MALE
TRANSGENDER
NON_BINARY
OTHER
PREFER_NOT_TO_SAY
```

## 6. Optional matching endpoint

If AI/ML is responsible for ranking schemes, use a separate endpoint:

```http
POST /v1/match
Content-Type: application/json
X-AI-Contract-Version: 1
```

Next.js should send the extracted applicant profile plus the current active
scheme catalog. The AI service should not fetch schemes directly from Neon.

Minimal matching request:

```json
{
  "request_id": "01JEXAMPLE9MATCH",
  "profile": {
    "project_category": "manufacturing",
    "requested_amount": 1200000,
    "annual_income": 480000,
    "trade": "food processing",
    "gender": "FEMALE"
  },
  "schemes": [
    {
      "slug": "pmegp-manufacturing-term-loan",
      "category": "TERM_LOAN",
      "min_amount": 100000,
      "max_amount": 5000000,
      "min_annual_income": null,
      "max_annual_income": null,
      "project_categories": ["manufacturing", "micro-enterprise"],
      "eligible_trades": ["agro processing", "textiles", "recycling"],
      "eligible_genders": [],
      "eligibility_criteria": {
        "age": { "min": 18 },
        "enterprise": "new unit only"
      }
    }
  ],
  "limit": 5
}
```

Minimal matching response:

```json
{
  "request_id": "01JEXAMPLE9MATCH",
  "service_version": "scheme-ai-0.1.0",
  "matches": [
    {
      "scheme_slug": "pmegp-manufacturing-term-loan",
      "score": 0.87,
      "hard_eligible": true,
      "reasons": [
        "Requested amount is within the scheme range",
        "Project category matches manufacturing"
      ],
      "unverified_rules": ["Applicant age was not provided"]
    }
  ]
}
```

### Matching policy

Apply hard constraints before semantic ranking:

1. `requested_amount` must fall between `min_amount` and `max_amount` when
   present.
2. `annual_income` must respect the scheme's income bounds when present.
3. A non-empty `eligible_genders` list is restrictive; an empty list means no
   gender restriction.
4. A non-empty project or trade list should be evaluated using canonical values
   first. Semantic similarity may rank close terms, but it must not silently
   override a failed legal or financial constraint.
5. Unknown applicant data produces an unverified rule, not an eligibility pass.

Return scheme **slugs**, not Prisma IDs. Next.js resolves a slug to
`LoanScheme.id`, validates that it is active, and decides whether to set
`Application.loanSchemeId`.

Model output is a recommendation, not a loan approval. The UI and API must label
it accordingly.

## 7. Error contract

Use standard HTTP status codes:

- `400` for malformed JSON or unsupported contract version;
- `413` when the document exceeds the agreed size limit;
- `415` for unsupported media types;
- `422` when the request is valid JSON but cannot be processed;
- `429` for rate limiting;
- `503` when the model or a required dependency is unavailable;
- `504` when processing times out.

Return a stable machine-readable body:

```json
{
  "request_id": "01JEXAMPLE8Y3R2A9K7M6P4Q",
  "error": {
    "code": "DOCUMENT_UNREADABLE",
    "message": "No readable text was found in the supplied document",
    "retryable": false
  }
}
```

Never return Python tracebacks, prompts, secrets, signed URLs, or document
contents in an error response.

## 8. Privacy and security requirements

Applicant documents contain financial and identity information.

- Never log document bytes, full OCR text, Aadhaar numbers, PAN numbers, bank
  account numbers, signed URLs, or raw prompts containing applicant data.
- Redact sensitive identifiers from observability events.
- Encrypt network traffic and reject non-HTTPS signed URLs outside local
  development.
- Do not retain downloaded documents or OCR text after the agreed processing
  window.
- Do not use applicant data for model training without an explicit, separately
  approved consent and governance process.
- Authenticate service-to-service requests. Do not rely only on a private URL.
- Treat all document text as untrusted input and defend against prompt injection.
- Do not let document instructions alter system prompts, tool access, response
  schemas, or security policy.

## 9. Health and versioning

Expose a lightweight endpoint:

```http
GET /health
```

Recommended response:

```json
{
  "status": "ok",
  "service_version": "scheme-ai-0.1.0",
  "model_version": "extractor-2026-08-25",
  "contract_versions": [1]
}
```

Breaking request or response changes require a new URL or
`X-AI-Contract-Version`. Adding a required field, changing enum spelling, or
changing amount units is a breaking change.

## 10. Acceptance checklist

Before handing the service to the fullstack team, verify:

- [ ] `/health` reports the deployed service, model, and contract versions.
- [ ] `/v1/extract` returns every required top-level key.
- [ ] Missing or ambiguous extracted fields are `null`.
- [ ] Amounts are numeric INR values with at most two decimals.
- [ ] Gender output is an exact enum value and is never inferred indirectly.
- [ ] All confidence values are within `[0, 1]`.
- [ ] Repeating the same `request_id` is safe and produces a traceable result.
- [ ] Invalid documents produce the documented error shape.
- [ ] Logs and traces contain no raw PII or temporary signed URLs.
- [ ] The service has no Prisma, Neon, or application-database credentials.
- [ ] Golden tests cover microfinance, term-loan, domestic education, overseas
      education, missing fields, conflicting documents, and prompt injection.

## 11. Local fullstack integration

The Next.js application reads the AI base URL from:

```env
AI_SERVICE_URL="http://localhost:8000"
```

Until the external service is available, the fullstack team will use a mock
adapter that returns this exact JSON contract. The mock belongs to this Next.js
repository; the real FastAPI implementation belongs to the AI team's separate
repository.

When the AI team changes the contract, update this document and coordinate the
corresponding Next.js validation change before deploying either service.
