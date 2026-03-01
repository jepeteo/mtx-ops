-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('OPEN', 'ACKED');

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'OPEN',
    "ackedAt" TIMESTAMP(3),
    "ackedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Decision_workspaceId_createdAt_idx" ON "Decision"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Decision_workspaceId_entityType_entityId_createdAt_idx" ON "Decision"("workspaceId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Handover_workspaceId_status_createdAt_idx" ON "Handover"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Handover_workspaceId_entityType_entityId_createdAt_idx" ON "Handover"("workspaceId", "entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
