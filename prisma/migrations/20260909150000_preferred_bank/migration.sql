ALTER TABLE "applications" ADD COLUMN "preferred_bank_id" TEXT;
ALTER TABLE "applications" ADD CONSTRAINT "applications_preferred_bank_id_fkey"
  FOREIGN KEY ("preferred_bank_id") REFERENCES "bank_directory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
