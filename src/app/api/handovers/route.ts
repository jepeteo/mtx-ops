import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { entityExistsInWorkspace } from "@/lib/entities/exists";

const EntityTypeSchema = z.enum(["Client", "Project", "Task"]);

const CreateHandoverSchema = z.object({
  entityType: EntityTypeSchema,
  entityId: z.string().uuid(),
  title: z.string().min(1).max(220),
  body: z.string().min(1).max(12000),
  toUserId: z.string().uuid(),
});

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = CreateHandoverSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid handover payload", parsed.error.flatten(), 400);
  }

  const exists = await entityExistsInWorkspace({
    workspaceId: auth.session.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  if (!exists) {
    return fail(auth.requestId, "NOT_FOUND", "Entity not found", { entityType: parsed.data.entityType, entityId: parsed.data.entityId }, 404);
  }

  const recipient = await db.user.findFirst({
    where: {
      id: parsed.data.toUserId,
      workspaceId: auth.session.workspaceId,
      status: "ACTIVE",
    },
    select: { id: true, email: true },
  });

  if (!recipient) {
    return fail(auth.requestId, "NOT_FOUND", "Recipient user not found or inactive", { toUserId: parsed.data.toUserId }, 404);
  }

  const handover = await db.handover.create({
    data: {
      workspaceId: auth.session.workspaceId,
      fromUserId: auth.session.userId,
      toUserId: recipient.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "OPEN",
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "handover.create",
    entityType: "Handover",
    entityId: handover.id,
    metadata: {
      entityType: handover.entityType,
      entityId: handover.entityId,
      title: handover.title,
      toUserId: handover.toUserId,
    },
  });

  return ok(auth.requestId, { handover }, { status: 201 });
}
