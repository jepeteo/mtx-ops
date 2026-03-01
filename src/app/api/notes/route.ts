import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const EntityTypeSchema = z.enum(["Client", "Project", "Task"]);

const CreateNoteSchema = z.object({
  entityType: EntityTypeSchema,
  entityId: z.string().uuid(),
  body: z.string().min(1).max(10000),
});

async function entityExists(input: { workspaceId: string; entityType: z.infer<typeof EntityTypeSchema>; entityId: string }) {
  if (input.entityType === "Client") {
    const entity = await db.client.findFirst({
      where: { id: input.entityId, workspaceId: input.workspaceId },
      select: { id: true },
    });
    return Boolean(entity);
  }

  if (input.entityType === "Project") {
    const entity = await db.project.findFirst({
      where: { id: input.entityId, workspaceId: input.workspaceId },
      select: { id: true },
    });
    return Boolean(entity);
  }

  const entity = await db.task.findFirst({
    where: { id: input.entityId, workspaceId: input.workspaceId },
    select: { id: true },
  });
  return Boolean(entity);
}

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = CreateNoteSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid note payload", parsed.error.flatten(), 400);
  }

  const exists = await entityExists({
    workspaceId: auth.session.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  if (!exists) {
    return fail(auth.requestId, "NOT_FOUND", "Entity not found", { entityType: parsed.data.entityType, entityId: parsed.data.entityId }, 404);
  }

  const note = await db.note.create({
    data: {
      workspaceId: auth.session.workspaceId,
      authorId: auth.session.userId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      body: parsed.data.body,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "note.create",
    entityType: "Note",
    entityId: note.id,
    metadata: {
      entityType: note.entityType,
      entityId: note.entityId,
      bodyLength: note.body.length,
    },
  });

  return ok(auth.requestId, { note }, { status: 201 });
}
