ALTER TABLE "loan_schemes"
ADD COLUMN "min_age" INTEGER,
ADD COLUMN "max_age" INTEGER,
ADD COLUMN "eligible_applicant_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "source_verified_at" TIMESTAMP(3);

ALTER TABLE "applications"
ADD COLUMN "age" INTEGER,
ADD COLUMN "applicant_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
