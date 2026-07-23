-- AlterEnum
ALTER TYPE "ApprovalStatus" ADD VALUE 'AMENDED';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "markedById" TEXT;

-- CreateIndex
CREATE INDEX "Attendance_approvalStatus_date_idx" ON "Attendance"("approvalStatus", "date");
