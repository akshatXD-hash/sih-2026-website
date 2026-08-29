ALTER TYPE "DocumentType" ADD VALUE 'CASTE_CERTIFICATE';

ALTER TABLE "document_uploads"
  ADD COLUMN "storage_provider" TEXT NOT NULL DEFAULT 'cloudinary',
  ADD COLUMN "storage_version" INTEGER,
  ADD COLUMN "storage_format" TEXT,
  ADD COLUMN "storage_resource_type" TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN "storage_delivery_type" TEXT NOT NULL DEFAULT 'authenticated',
  ADD COLUMN "ocr_confirmed_at" TIMESTAMP(3);

CREATE TABLE "application_notes" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_status_events" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "changed_by_id" TEXT,
  "from_status" "ApplicationStatus",
  "to_status" "ApplicationStatus" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_notes_application_id_created_at_idx"
  ON "application_notes"("application_id", "created_at");
CREATE INDEX "application_status_events_application_id_created_at_idx"
  ON "application_status_events"("application_id", "created_at");
CREATE INDEX "application_status_events_to_status_created_at_idx"
  ON "application_status_events"("to_status", "created_at");

ALTER TABLE "application_notes"
  ADD CONSTRAINT "application_notes_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_notes"
  ADD CONSTRAINT "application_notes_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_status_events"
  ADD CONSTRAINT "application_status_events_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_status_events"
  ADD CONSTRAINT "application_status_events_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
