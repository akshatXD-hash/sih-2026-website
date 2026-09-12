ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ASHA_WORKER';
-- Assisted villagers do not need an email address or a login credential.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
CREATE TABLE "asha_cases" (
  "id" TEXT PRIMARY KEY,
  "worker_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "applicant_id" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "application_id" TEXT NOT NULL UNIQUE REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "village" TEXT NOT NULL,
  "phone" TEXT,
  "contact_name" TEXT,
  "contact_kind" TEXT NOT NULL DEFAULT 'NONE' CHECK ("contact_kind" IN ('SELF', 'FAMILY', 'NONE')),
  "consented_at" TIMESTAMP(3) NOT NULL,
  "consent_version" TEXT NOT NULL DEFAULT 'assisted-application-v1',
  "follow_up_at" TIMESTAMP(3),
  "follow_up_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "asha_cases_worker_id_updated_at_idx" ON "asha_cases"("worker_id", "updated_at");
CREATE INDEX "asha_cases_worker_id_follow_up_at_idx" ON "asha_cases"("worker_id", "follow_up_at");
