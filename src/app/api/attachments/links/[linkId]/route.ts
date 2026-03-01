import { requireRoleApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, logServerError, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { deleteAttachmentObject } from "@/lib/storage/s3";

type RouteParams = { linkId: string };

export async function DELETE(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const existing = await db.attachmentLink.findFirst({
    where: {
      id: routeParams.linkId,
      workspaceId: auth.session.workspaceId,
    },
    include: {
      attachment: {
        select: {
          id: true,
          fileName: true,
          storageKey: true,
        },
      },
    },
  });

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Attachment link not found", { linkId: routeParams.linkId }, 404);
  }

  await db.attachmentLink.delete({ where: { id: existing.id } });

  const remainingLinks = await db.attachmentLink.count({
    where: {
      attachmentId: existing.attachmentId,
      workspaceId: auth.session.workspaceId,
    },
  });

  let attachmentDeleted = false;
  let storageDeleted = false;
  let storageDeleteError: string | null = null;
  if (remainingLinks === 0) {
    try {
      await deleteAttachmentObject(existing.attachment.storageKey);
      storageDeleted = true;
    } catch (error) {
      storageDeleteError = error instanceof Error ? error.message : "Unknown storage delete error";
      logServerError({
        requestId: auth.requestId,
        code: "UPSTREAM_UNAVAILABLE",
        message: "Attachment storage cleanup failed",
        error,
        metadata: {
          attachmentId: existing.attachmentId,
          storageKey: existing.attachment.storageKey,
          linkId: existing.id,
        },
      });
    }

    await db.attachment.delete({ where: { id: existing.attachmentId } });
    attachmentDeleted = true;
  }

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "attachment.unlink",
    entityType: "Attachment",
    entityId: existing.attachmentId,
    metadata: {
      linkId: existing.id,
      entityType: existing.entityType,
      entityId: existing.entityId,
      fileName: existing.attachment.fileName,
      attachmentDeleted,
      storageDeleted,
      storageDeleteError,
    },
  });

  return ok(auth.requestId, {
    unlinked: true,
    linkId: existing.id,
    attachmentId: existing.attachmentId,
    attachmentDeleted,
    storageDeleted,
    storageDeleteError,
  });
}
