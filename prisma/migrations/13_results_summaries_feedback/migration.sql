
-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "givenByRole" TEXT NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "period" TEXT,
ADD COLUMN     "targetTeacherId" TEXT,
ADD COLUMN     "wardId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT,
    "examName" TEXT NOT NULL,
    "examDate" TIMESTAMP(3),
    "subject" TEXT,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "grade" TEXT,
    "publishedAt" TIMESTAMP(3),
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSessionSummary" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "topicsCovered" TEXT NOT NULL,
    "homework" TEXT,
    "remarks" TEXT,
    "uploadedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSessionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Result_studentId_idx" ON "Result"("studentId");

-- CreateIndex
CREATE INDEX "Result_batchId_examName_idx" ON "Result"("batchId", "examName");

-- CreateIndex
CREATE INDEX "ClassSessionSummary_batchId_sessionDate_idx" ON "ClassSessionSummary"("batchId", "sessionDate");

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionSummary" ADD CONSTRAINT "ClassSessionSummary_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

