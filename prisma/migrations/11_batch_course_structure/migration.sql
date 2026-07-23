
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "admissionDate" TIMESTAMP(3),
ADD COLUMN     "classOrStandard" TEXT,
ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "enrolmentNo" TEXT,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "subjectSpecialisation" TEXT;

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "scheduleDays" TEXT,
ADD COLUMN     "scheduleTime" TEXT,
ADD COLUMN     "teacherId" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "CourseBatch" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "CourseBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseBatch_batchId_idx" ON "CourseBatch"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBatch_courseId_batchId_key" ON "CourseBatch"("courseId", "batchId");

-- CreateIndex
CREATE INDEX "Batch_teacherId_idx" ON "Batch"("teacherId");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBatch" ADD CONSTRAINT "CourseBatch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBatch" ADD CONSTRAINT "CourseBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: one CourseBatch row per existing course (its current batch)
INSERT INTO "CourseBatch" (id, "courseId", "batchId")
SELECT gen_random_uuid()::text, id, "batchId" FROM "Course"
ON CONFLICT DO NOTHING;

-- Backfill: batch owner = teacher of its first course
UPDATE "Batch" b SET "teacherId" = (
  SELECT c."teacherId" FROM "Course" c WHERE c."batchId" = b.id ORDER BY c."createdAt" ASC LIMIT 1
) WHERE b."teacherId" IS NULL;
