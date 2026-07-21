-- CreateTable
CREATE TABLE "ResourceProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceProgress_studentId_idx" ON "ResourceProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceProgress_studentId_resourceId_key" ON "ResourceProgress"("studentId", "resourceId");

-- AddForeignKey
ALTER TABLE "ResourceProgress" ADD CONSTRAINT "ResourceProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceProgress" ADD CONSTRAINT "ResourceProgress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
