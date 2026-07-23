
-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affectedUserId" TEXT,
    "affectedRole" TEXT,
    "screenOrEndpoint" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "requestPayloadRedacted" TEXT,
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'MEDIUM',
    "resolvedFlag" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorLog_resolvedFlag_occurredAt_idx" ON "ErrorLog"("resolvedFlag", "occurredAt");

-- CreateIndex
CREATE INDEX "ErrorLog_affectedRole_idx" ON "ErrorLog"("affectedRole");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

