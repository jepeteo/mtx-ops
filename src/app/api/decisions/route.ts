import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { entityExistsInWorkspace } from "@/lib/entities/exists";

const EntityTypeSchema = z.enum(["Client", "Project", "Task"]);

const CreateDecisionSchema = z.object({
  entityType: EntityTypeSchema,
  entityId: z.string().uuid(),
  title: z.string().min(1).max(220),
  body: z.string().min(1).max(10000),
});

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = CreateDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid decision payload", parsed.error.flatten(), 400);
  }

  const exists = await entityExistsInWorkspace({
    workspaceId: auth.session.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  if (!exists) {
    return fail(auth.requestId, "NOT_FOUND", "Entity not found", { entityType: parsed.data.entityType, entityId: parsed.data.entityId }, 404);
  }

  const decision = await db.decision.create({
    data: {
      workspaceId: auth.session.workspaceId,
      authorId: auth.session.userId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "decision.create",
    entityType: "Decision",
    entityId: decision.id,
    metadata: {
      entityType: decision.entityType,
      entityId: decision.entityId,
      title: decision.title,
      bodyLength: decision.body.length,
    },
  });

  return ok(auth.requestId, { decision }, { status: 201 });
}
