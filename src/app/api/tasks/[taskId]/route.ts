import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const StatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);

const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).max(280).optional(),
    status: StatusSchema.optional(),
    dueAt: z.string().datetime().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

type RouteParams = { taskId: string };

export async function PATCH(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid task payload", parsed.error.flatten(), 400);
  }

  const existing = await db.task.findFirst({
    where: {
      id: params.taskId,
      workspaceId: auth.session.workspaceId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      clientId: true,
    },
  });

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Task not found", { taskId: params.taskId }, 404);
  }

  if (parsed.data.clientId) {
    const client = await db.client.findFirst({
      where: { id: parsed.data.clientId, workspaceId: auth.session.workspaceId },
      select: { id: true },
    });

    if (!client) {
      return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: parsed.data.clientId }, 404);
    }
  }

  const updated = await db.task.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      status: parsed.data.status,
      dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      clientId: parsed.data.clientId === undefined ? undefined : parsed.data.clientId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "task.update",
    entityType: "Task",
    entityId: updated.id,
    metadata: {
      previous: {
        title: existing.title,
        status: existing.status,
        dueAt: existing.dueAt?.toISOString() ?? null,
        clientId: existing.clientId,
      },
      next: {
        title: updated.title,
        status: updated.status,
        dueAt: updated.dueAt?.toISOString() ?? null,
        clientId: updated.clientId,
      },
    },
  });

  return ok(auth.requestId, { task: updated });
}

export async function DELETE(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await db.task.findFirst({
    where: {
      id: params.taskId,
      workspaceId: auth.session.workspaceId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
    },
  });

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Task not found", { taskId: params.taskId }, 404);
  }

  await db.task.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "task.delete",
    entityType: "Task",
    entityId: existing.id,
    metadata: {
      title: existing.title,
      status: existing.status,
      dueAt: existing.dueAt?.toISOString() ?? null,
    },
  });

  return ok(auth.requestId, { deleted: true, taskId: existing.id });
}
