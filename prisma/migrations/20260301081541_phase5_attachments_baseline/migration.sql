-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachmentLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttachmentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_workspaceId_createdAt_idx" ON "Attachment"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_workspaceId_status_createdAt_idx" ON "Attachment"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_workspaceId_storageKey_idx" ON "Attachment"("workspaceId", "storageKey");

-- CreateIndex
CREATE INDEX "AttachmentLink_workspaceId_entityType_entityId_createdAt_idx" ON "AttachmentLink"("workspaceId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AttachmentLink_workspaceId_attachmentId_idx" ON "AttachmentLink"("workspaceId", "attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttachmentLink_attachmentId_entityType_entityId_key" ON "AttachmentLink"("attachmentId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachmentLink" ADD CONSTRAINT "AttachmentLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachmentLink" ADD CONSTRAINT "AttachmentLink_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
