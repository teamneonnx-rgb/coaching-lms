
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SINGLE_WORD', 'LONG_ANSWER');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PARTIAL_AWAITING_EVALUATION', 'EVALUATED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'MCQ';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "evaluationStatus" "EvaluationStatus",
ADD COLUMN     "objectiveScore" DOUBLE PRECISION,
ADD COLUMN     "overriddenById" TEXT,
ADD COLUMN     "subjectiveScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "autoScored" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "evaluatorRemark" TEXT,
ADD COLUMN     "marksAwarded" DOUBLE PRECISION,
ADD COLUMN     "studentAnswer" TEXT;

