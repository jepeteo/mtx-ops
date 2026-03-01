import { db } from "@/lib/db/db";
import { env } from "@/lib/env";
import { deleteAttachmentObject } from "@/lib/storage/s3";
import { fail, getRequestId, logServerError, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const ORPHAN_BATCH_SIZE = 200;
const ORPHAN_MIN_AGE_HOURS = 2;

/**
 * Called by Vercel cron to clean orphan attachments whose storage cleanup likely failed previously.
 */
export async function GET(req: Request) {
  const requestId = getRequestId(req);

  if (env.CRON_SECRET) {
    const headerSecret = req.headers.get("x-cron-secret");
    const authorization = req.headers.get("authorization") ?? "";
    const bearerSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    const isValid = headerSecret === env.CRON_SECRET || bearerSecret === env.CRON_SECRET;
    if (!isValid) {
      return fail(requestId, "FORBIDDEN", "Invalid cron secret", undefined, 403);
    }
  }

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
      createdAt: true,
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
        actorId: "system:cron",
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
        requestId,
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

  return ok(requestId, {
    scanned: orphans.length,
    deleted: deletedCount,
    failed: failedCount,
    orphanMinAgeHours: ORPHAN_MIN_AGE_HOURS,
    batchSize: ORPHAN_BATCH_SIZE,
  });
}
