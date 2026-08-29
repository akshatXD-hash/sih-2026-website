# AI Service Integration Guide

This repository owns the Next.js fullstack application. AI/ML remains a
separately deployed FastAPI service; it must not connect to Neon, import Prisma,
or decide eligibility or approval.

Live API documentation: <https://sih-26-ai-ml.onrender.com/docs>

## Boundary and source of truth

The TypeScript boundary is `src/lib/ai-service.ts`. All server-side features
that need AI output must call `getAiService()` instead of using `fetch`
directly. Zod schemas in `src/lib/ai-service/contracts.ts` mirror the deployed
OpenAPI responses. `AI_SERVICE_MODE=mock` selects the deterministic local
adapter; `AI_SERVICE_MODE=remote` selects the deployed service without changing
callers.

The fullstack service owns authentication, documents, Prisma/Neon access,
application status, response validation, deterministic matching, and all
database writes. The AI service only extracts, explains, and returns structured
output.

## Deployed endpoints

| Method and path | Fullstack client method | Purpose |
| --- | --- | --- |
| `GET /health` | `health()` | Service availability |
| `POST /simplify-term` | `simplifyTerm()` | Plain-language term explanation |
| `POST /scheme-chat` | `chat()` | Scheme Q&A with optional history |
| `POST /extract-applicant-intent` | `extractApplicantIntent()` | Structured applicant facts from a transcript |
| `POST /recommend-scheme-explainer` | `explainRecommendation()` | Explanation of deterministic candidate results |
| `POST /ocr-certificate` | `ocrCertificate()` | Multipart caste/income certificate extraction |

The recommendation endpoint is an explainer only. `src/lib/matching.ts` remains
the authority for hard eligibility and ranking. Callers must calculate eligible
candidates first and send only those candidates to the explainer.

## Applicant intent mapping

The deployed endpoint returns these required fields:

```json
{
  "project_category": "Manufacturing | Service | Trading",
  "requested_amount": 140000,
  "annual_income": 240000,
  "trade": "tailoring",
  "gender": "Female",
  "confidence": 0.91
}
```

The adapter maps categories to the application's canonical slugs:

- `Manufacturing` → `manufacturing`
- `Service` → `services`
- `Trading` → `trading`

The live OpenAPI descriptions say missing amounts may be returned as zero and
unknown gender may default to `Male`. Those are unsafe values to persist as
facts. The adapter therefore converts zero amounts to `null` with warnings and
always returns `gender: null`, plus a `suggested_gender` and
`requires_gender_confirmation: true`. The applicant must explicitly confirm a
gender before Next.js writes the Prisma `Gender` field. Never infer gender from
a name, voice, trade, photo, or model default.

Relevant Prisma destinations are:

| Safe adapter field | Prisma `Application` field | Rule |
| --- | --- | --- |
| `project_category` | `projectCategory` | Canonical slug |
| `requested_amount` | `requestedAmount` | INR or `null` |
| `annual_income` | `annualIncome` | Annual INR or `null` |
| `trade` | `trade` | Trimmed text or `null` |
| confirmed gender only | `gender` | Exact Prisma enum or `null` |
| `confidence` | `aiConfidence` | `0` through `1` |
| validated raw response | `aiOutput` | Traceability; apply retention policy |

`LoanScheme.category` is a product type (`MICRO_FINANCE`, `TERM_LOAN`, or
`EDUCATION_LOAN`), not the applicant's project category.

## Certificate OCR

`ocrCertificate()` sends `multipart/form-data` with a binary `file` and a
`doc_type` of exactly `caste` or `income`. The validated response contains the
document type, name, optional category, optional annual income, optional expiry,
verification flag, and confidence. OCR output is evidence for review, not an
automatic approval. File storage and database updates stay in Next.js.

## Configuration

```env
# Offline/default development
AI_SERVICE_MODE="mock"
AI_SERVICE_URL="https://sih-26-ai-ml.onrender.com"
AI_SERVICE_TIMEOUT_MS="30000"

# Live integration
AI_SERVICE_MODE="remote"
```

The remote client disables caching, applies a bounded timeout, rejects malformed
responses, and does not include upstream response bodies in errors. Do not send
`DATABASE_URL`, `DIRECT_URL`, Auth.js secrets, or Prisma credentials to the AI
service.

## AI teammate checklist

- Keep OpenAPI request/response schemas backward compatible or coordinate a
  versioned fullstack schema update before deployment.
- Return numeric INR values without currency symbols or commas.
- Use nullable fields for missing facts instead of believable defaults.
- Never make eligibility, sanction, approval, or rejection decisions.
- Never log raw applicant documents, credentials, full transcripts, or model
  prompts containing personally identifiable information.
- Return concise evidence or warnings, never hidden chain-of-thought.
- Add service authentication before production; the current OpenAPI contract
  documents no authentication mechanism.
- Keep the FastAPI project separate from this repository.

Run `npm test` in this repository after any contract update. The adapter tests
cover endpoint payloads, response drift, multipart OCR, safe normalization, and
mock/remote interchangeability.
