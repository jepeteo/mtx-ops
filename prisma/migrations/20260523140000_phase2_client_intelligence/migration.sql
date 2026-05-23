-- CreateEnum
CREATE TYPE "AgencyServiceBillingCadence" AS ENUM ('monthly', 'quarterly', 'annual', 'ad_hoc');

-- CreateEnum
CREATE TYPE "AgencyServiceStatus" AS ENUM ('active', 'paused', 'ended');

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyService" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billingCadence" "AgencyServiceBillingCadence" NOT NULL,
    "amountMinor" INTEGER,
    "currency" TEXT,
    "status" "AgencyServiceStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMemberAccess" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMemberAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Contact_clientId_isPrimary_idx" ON "Contact"("clientId", "isPrimary");

-- CreateIndex
CREATE INDEX "AgencyService_clientId_idx" ON "AgencyService"("clientId");

-- CreateIndex
CREATE INDEX "AgencyService_clientId_status_idx" ON "AgencyService"("clientId", "status");

-- CreateIndex
CREATE INDEX "AgencyService_projectId_idx" ON "AgencyService"("projectId");

-- CreateIndex
CREATE INDEX "ClientMemberAccess_workspaceId_idx" ON "ClientMemberAccess"("workspaceId");

-- CreateIndex
CREATE INDEX "ClientMemberAccess_userId_idx" ON "ClientMemberAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMemberAccess_clientId_userId_key" ON "ClientMemberAccess"("clientId", "userId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyService" ADD CONSTRAINT "AgencyService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyService" ADD CONSTRAINT "AgencyService_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMemberAccess" ADD CONSTRAINT "ClientMemberAccess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMemberAccess" ADD CONSTRAINT "ClientMemberAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMemberAccess" ADD CONSTRAINT "ClientMemberAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
