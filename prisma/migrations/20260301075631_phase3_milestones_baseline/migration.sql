-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_workspaceId_status_dueAt_idx" ON "Milestone"("workspaceId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Milestone_projectId_dueAt_idx" ON "Milestone"("projectId", "dueAt");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
