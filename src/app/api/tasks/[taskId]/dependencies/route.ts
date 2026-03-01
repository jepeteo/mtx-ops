import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const CreateDependencySchema = z.object({
  blockerTaskId: z.string().uuid(),
});

type RouteParams = { taskId: string };

export async function POST(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const body = await req.json().catch(() => null);
  const parsed = CreateDependencySchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid dependency payload", parsed.error.flatten(), 400);
  }

  if (routeParams.taskId === parsed.data.blockerTaskId) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Task cannot depend on itself", undefined, 400);
  }

  const [blockedTask, blockerTask] = await Promise.all([
    db.task.findFirst({
      where: {
        id: routeParams.taskId,
        workspaceId: auth.session.workspaceId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    }),
    db.task.findFirst({
      where: {
        id: parsed.data.blockerTaskId,
        workspaceId: auth.session.workspaceId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    }),
  ]);

  if (!blockedTask) {
    return fail(auth.requestId, "NOT_FOUND", "Target task not found", { taskId: routeParams.taskId }, 404);
  }

  if (!blockerTask) {
    return fail(auth.requestId, "NOT_FOUND", "Blocker task not found", { blockerTaskId: parsed.data.blockerTaskId }, 404);
  }

  const existing = await db.taskDependency.findFirst({
    where: {
      blockedTaskId: blockedTask.id,
      blockerTaskId: blockerTask.id,
    },
    select: { id: true },
  });

  if (existing) {
    return fail(
      auth.requestId,
      "CONFLICT",
      "Dependency already exists",
      { blockedTaskId: blockedTask.id, blockerTaskId: blockerTask.id },
      409,
    );
  }

  const dependency = await db.taskDependency.create({
    data: {
      workspaceId: auth.session.workspaceId,
      blockedTaskId: blockedTask.id,
      blockerTaskId: blockerTask.id,
    },
    include: {
      blockedTask: {
        select: { id: true, title: true, status: true },
      },
      blockerTask: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "task.dependency.create",
    entityType: "Task",
    entityId: blockedTask.id,
    metadata: {
      blockedTaskId: blockedTask.id,
      blockedTaskTitle: blockedTask.title,
      blockerTaskId: blockerTask.id,
      blockerTaskTitle: blockerTask.title,
    },
  });

  return ok(auth.requestId, { dependency }, { status: 201 });
}
