import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { entityExistsInWorkspace } from "@/lib/entities/exists";
import { AttachmentEntityTypeSchema } from "@/lib/storage/entityTypes";

const LinkSchema = z.object({
  attachmentId: z.string().uuid(),
  entityType: AttachmentEntityTypeSchema,
  entityId: z.string().uuid(),
  label: z.string().max(120).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = LinkSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid attachment link payload", parsed.error.flatten(), 400);
  }

  const exists = await entityExistsInWorkspace({
    workspaceId: auth.session.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  if (!exists) {
    return fail(auth.requestId, "NOT_FOUND", "Entity not found", { entityType: parsed.data.entityType, entityId: parsed.data.entityId }, 404);
  }

  const attachment = await db.attachment.findFirst({
    where: {
      id: parsed.data.attachmentId,
      workspaceId: auth.session.workspaceId,
    },
    select: {
      id: true,
      fileName: true,
      status: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  if (!attachment) {
    return fail(auth.requestId, "NOT_FOUND", "Attachment not found", { attachmentId: parsed.data.attachmentId }, 404);
  }

  const duplicate = await db.attachmentLink.findFirst({
    where: {
      attachmentId: attachment.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    },
    select: { id: true },
  });

  if (duplicate) {
    return fail(auth.requestId, "CONFLICT", "Attachment is already linked to this entity", undefined, 409);
  }

  const link = await db.attachmentLink.create({
    data: {
      workspaceId: auth.session.workspaceId,
      attachmentId: attachment.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      label: parsed.data.label ?? null,
      createdById: auth.session.userId,
    },
  });

  await db.attachment.update({
    where: { id: attachment.id },
    data: { status: "READY" },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "attachment.link",
    entityType: "Attachment",
    entityId: attachment.id,
    metadata: {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      linkId: link.id,
      label: link.label,
      fileName: attachment.fileName,
    },
  });

  return ok(auth.requestId, {
    link: {
      id: link.id,
      attachmentId: attachment.id,
      entityType: link.entityType,
      entityId: link.entityId,
      label: link.label,
    },
  }, { status: 201 });
}
