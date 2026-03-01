import { db } from "@/lib/db/db";
import { deleteAttachmentObject } from "@/lib/storage/s3";
import { logServerError } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const ORPHAN_BATCH_SIZE = 200;
const ORPHAN_MIN_AGE_HOURS = 2;

export type AttachmentCleanupResult = {
  scanned: number;
  deleted: number;
  failed: number;
  orphanMinAgeHours: number;
  batchSize: number;
};

export async function runOrphanAttachmentCleanup(input: {
  actorId: string;
  requestId: string;
}): Promise<AttachmentCleanupResult> {
  const cutoff = new Date(Date.now() - ORPHAN_MIN_AGE_HOURS * 60 * 60 * 1000);

  const orphans = await db.attachment.findMany({
    where: {
      createdAt: { lte: cutoff },
      links: { none: {} },
    },
    select: {
      id: true,
      workspaceId: true,
      fileName: true,
      storageKey: true,
    },
    orderBy: [{ createdAt: "asc" }],
    take: ORPHAN_BATCH_SIZE,
  });

  let deletedCount = 0;
  let failedCount = 0;

  for (const attachment of orphans) {
    try {
      await deleteAttachmentObject(attachment.storageKey);

      await db.attachment.delete({ where: { id: attachment.id } });

      await logActivity({
        workspaceId: attachment.workspaceId,
        actorId: input.actorId,
        action: "attachment.cleanup",
        entityType: "Attachment",
        entityId: attachment.id,
        metadata: {
          fileName: attachment.fileName,
          storageKey: attachment.storageKey,
          orphanMinAgeHours: ORPHAN_MIN_AGE_HOURS,
        },
      });

      deletedCount += 1;
    } catch (error) {
      failedCount += 1;

      logServerError({
        requestId: input.requestId,
        code: "UPSTREAM_UNAVAILABLE",
        message: "Orphan attachment cleanup failed",
        error,
        metadata: {
          attachmentId: attachment.id,
          storageKey: attachment.storageKey,
        },
      });
    }
  }

  return {
    scanned: orphans.length,
    deleted: deletedCount,
    failed: failedCount,
    orphanMinAgeHours: ORPHAN_MIN_AGE_HOURS,
    batchSize: ORPHAN_BATCH_SIZE,
  };
}
