-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "AuditEntry" ADD COLUMN     "afterValue" TEXT,
ADD COLUMN     "beforeValue" TEXT,
ADD COLUMN     "ip" TEXT;

-- CreateTable
CREATE TABLE "AdminCapability" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminCapability_adminUserId_idx" ON "AdminCapability"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCapability_adminUserId_capabilityKey_key" ON "AdminCapability"("adminUserId", "capabilityKey");

-- AddForeignKey
ALTER TABLE "AdminCapability" ADD CONSTRAINT "AdminCapability_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCapability" ADD CONSTRAINT "AdminCapability_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FR-SA-00: Super Admin is a singleton — enforced at the database level.
-- Partial unique index: at most one non-deleted SUPER_ADMIN row can exist.
CREATE UNIQUE INDEX "User_single_super_admin" ON "User"("role") WHERE "role" = 'SUPER_ADMIN' AND "deletedAt" IS NULL;
