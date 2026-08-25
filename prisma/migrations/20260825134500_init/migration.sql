-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Prisma Client cannot natively query PostGIS geography columns. The schema
-- represents the column as Unsupported, and this hand-written statement must
-- enable the extension before that column is created.
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('APPLICANT', 'CHANNEL_PARTNER', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'TRANSGENDER', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "LoanCategory" AS ENUM ('MICRO_FINANCE', 'TERM_LOAN', 'EDUCATION_LOAN');

-- CreateEnum
CREATE TYPE "ChannelPartnerType" AS ENUM ('BANK', 'NBFC', 'MICROFINANCE_INSTITUTION', 'NGO', 'COMMON_SERVICE_CENTRE', 'SELF_HELP_GROUP', 'EDUCATIONAL_INSTITUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'EXTRACTION_PENDING', 'EXTRACTION_COMPLETE', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'ADDRESS_PROOF', 'INCOME_PROOF', 'BANK_STATEMENT', 'PROJECT_REPORT', 'EDUCATION_CERTIFICATE', 'ADMISSION_LETTER', 'FEE_STRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'APPLICANT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_schemes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" "LoanCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "min_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "max_amount" DECIMAL(14,2) NOT NULL,
    "min_annual_income" DECIMAL(14,2),
    "max_annual_income" DECIMAL(14,2),
    "interest_rate_min" DECIMAL(5,2),
    "interest_rate_max" DECIMAL(5,2),
    "tenure_months_min" INTEGER,
    "tenure_months_max" INTEGER,
    "project_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligible_trades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligible_genders" "Gender"[] DEFAULT ARRAY[]::"Gender"[],
    "collateral_required" BOOLEAN NOT NULL DEFAULT false,
    "eligibility_criteria" JSONB,
    "required_documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelPartnerType" NOT NULL,
    "registration_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address_line" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "service_radius_km" DECIMAL(7,2),
    "fund_quota_amount" DECIMAL(14,2),
    "available_fund_amount" DECIMAL(14,2),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "location" geography(Point, 4326),

    CONSTRAINT "channel_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "user_id" TEXT NOT NULL,
    "loan_scheme_id" TEXT,
    "channel_partner_id" TEXT,
    "project_category" TEXT,
    "requested_amount" DECIMAL(14,2),
    "annual_income" DECIMAL(14,2),
    "trade" TEXT,
    "gender" "Gender",
    "ai_output" JSONB,
    "ai_confidence" DECIMAL(5,4),
    "ai_service_version" TEXT,
    "ai_processed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_uploads" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "verified_by_id" TEXT,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "original_file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "extracted_data" JSONB,
    "failure_reason" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "loan_schemes_slug_key" ON "loan_schemes"("slug");

-- CreateIndex
CREATE INDEX "loan_schemes_category_is_active_idx" ON "loan_schemes"("category", "is_active");

-- CreateIndex
CREATE INDEX "loan_schemes_max_amount_idx" ON "loan_schemes"("max_amount");

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_registration_number_key" ON "channel_partners"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_email_key" ON "channel_partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_manager_id_key" ON "channel_partners"("manager_id");

-- CreateIndex
CREATE INDEX "channel_partners_district_state_is_active_idx" ON "channel_partners"("district", "state", "is_active");

-- PostGIS index used by distance and nearest-partner queries.
CREATE INDEX "channel_partners_location_gist_idx" ON "channel_partners" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_number_key" ON "applications"("reference_number");

-- CreateIndex
CREATE INDEX "applications_user_id_created_at_idx" ON "applications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_loan_scheme_id_status_idx" ON "applications"("loan_scheme_id", "status");

-- CreateIndex
CREATE INDEX "applications_channel_partner_id_status_idx" ON "applications"("channel_partner_id", "status");

-- CreateIndex
CREATE INDEX "applications_status_created_at_idx" ON "applications"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_uploads_storage_key_key" ON "document_uploads"("storage_key");

-- CreateIndex
CREATE INDEX "document_uploads_application_id_type_idx" ON "document_uploads"("application_id", "type");

-- CreateIndex
CREATE INDEX "document_uploads_status_created_at_idx" ON "document_uploads"("status", "created_at");

-- AddForeignKey
ALTER TABLE "channel_partners" ADD CONSTRAINT "channel_partners_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_loan_scheme_id_fkey" FOREIGN KEY ("loan_scheme_id") REFERENCES "loan_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_channel_partner_id_fkey" FOREIGN KEY ("channel_partner_id") REFERENCES "channel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
