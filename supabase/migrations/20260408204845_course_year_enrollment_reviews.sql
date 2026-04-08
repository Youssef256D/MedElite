DO $$
BEGIN
  CREATE TYPE "StudentYear" AS ENUM ('YEAR_1', 'YEAR_2', 'YEAR_3', 'YEAR_4', 'YEAR_5');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CourseAccessType" AS ENUM ('FREE', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('VODAFONE_CASH', 'INSTAPAY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "studentYear" "StudentYear";

UPDATE "User"
SET "studentYear" = 'YEAR_1'
WHERE "role" = 'STUDENT'
  AND "studentYear" IS NULL;

ALTER TABLE "Course"
  ALTER COLUMN "categoryId" DROP NOT NULL;

ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "targetStudentYear" "StudentYear",
  ADD COLUMN IF NOT EXISTS "accessType" "CourseAccessType",
  ADD COLUMN IF NOT EXISTS "priceCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT;

UPDATE "Course"
SET "targetStudentYear" = COALESCE("targetStudentYear", 'YEAR_1');

UPDATE "Course"
SET "accessType" = CASE
  WHEN "isPremium" THEN 'PAID'::"CourseAccessType"
  ELSE 'FREE'::"CourseAccessType"
END
WHERE "accessType" IS NULL;

UPDATE "Course"
SET
  "submittedAt" = COALESCE("submittedAt", "createdAt"),
  "approvedAt" = CASE
    WHEN "status" = 'PUBLISHED' THEN COALESCE("approvedAt", "publishedAt", "updatedAt", "createdAt")
    ELSE "approvedAt"
  END
WHERE "submittedAt" IS NULL
   OR ("status" = 'PUBLISHED' AND "approvedAt" IS NULL);

ALTER TABLE "Course"
  ALTER COLUMN "targetStudentYear" SET NOT NULL,
  ALTER COLUMN "targetStudentYear" SET DEFAULT 'YEAR_1',
  ALTER COLUMN "accessType" SET NOT NULL,
  ALTER COLUMN "accessType" SET DEFAULT 'PAID';

ALTER TABLE "Enrollment"
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "paymentScreenshotStorageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentScreenshotContentType" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT;

UPDATE "Enrollment"
SET "reviewedAt" = COALESCE("reviewedAt", "updatedAt", "createdAt")
WHERE "status" IN ('ACTIVE', 'COMPLETED')
  AND "reviewedAt" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Course_approvedById_fkey'
  ) THEN
    ALTER TABLE "Course"
      ADD CONSTRAINT "Course_approvedById_fkey"
      FOREIGN KEY ("approvedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Enrollment_reviewedById_fkey'
  ) THEN
    ALTER TABLE "Enrollment"
      ADD CONSTRAINT "Enrollment_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
