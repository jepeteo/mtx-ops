import { z } from "zod";
import { randomUUID } from "crypto";
import { requireRoleApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, logServerError, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { entityExistsInWorkspace } from "@/lib/entities/exists";
import { AttachmentEntityTypeSchema } from "@/lib/storage/entityTypes";
import { buildStorageKey, createAttachmentPresign } from "@/lib/storage/s3";

const PresignSchema = z.object({
  entityType: AttachmentEntityTypeSchema,
  entityId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});

export async function POST(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = PresignSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid attachment presign payload", parsed.error.flatten(), 400);
  }

  const exists = await entityExistsInWorkspace({
    workspaceId: auth.session.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  if (!exists) {
    return fail(auth.requestId, "NOT_FOUND", "Entity not found", { entityType: parsed.data.entityType, entityId: parsed.data.entityId }, 404);
  }

  const attachmentId = randomUUID();
  const storageKey = buildStorageKey({
    workspaceId: auth.session.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    fileName: parsed.data.fileName,
  });

  try {
    const presign = await createAttachmentPresign({
      storageKey,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    });

    const attachment = await db.attachment.create({
      data: {
        id: attachmentId,
        workspaceId: auth.session.workspaceId,
        createdById: auth.session.userId,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
        storageKey,
        status: "PENDING",
      },
    });

    await logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "attachment.presign",
      entityType: "Attachment",
      entityId: attachment.id,
      metadata: {
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
      },
    });

    return ok(auth.requestId, {
      attachmentId: attachment.id,
      storageKey,
      upload: presign,
    });
  } catch (error) {
    logServerError({
      requestId: auth.requestId,
      code: "INTERNAL",
      message: "Attachment presign failed",
      error,
    });

    return fail(auth.requestId, "INTERNAL", "Attachment presign failed. Check storage configuration.", undefined, 500);
  }
}
