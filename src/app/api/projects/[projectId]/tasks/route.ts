import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const TaskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(280),
  status: TaskStatusSchema.default("TODO"),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const project = await db.project.findFirst({
    where: {
      id: routeParams.projectId,
      workspaceId: auth.session.workspaceId,
    },
    select: { id: true },
  });

  if (!project) {
    return fail(auth.requestId, "NOT_FOUND", "Project not found", { projectId: routeParams.projectId }, 404);
  }

  const tasks = await db.task.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
      projectId: routeParams.projectId,
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
        },
      },
    },
  });

  return ok(auth.requestId, { tasks });
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const project = await db.project.findFirst({
    where: {
      id: routeParams.projectId,
      workspaceId: auth.session.workspaceId,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      clientId: true,
    },
  });

  if (!project) {
    return fail(auth.requestId, "NOT_FOUND", "Project not found", { projectId: routeParams.projectId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid task payload", parsed.error.flatten(), 400);
  }

  const task = await db.task.create({
    data: {
      workspaceId: auth.session.workspaceId,
      projectId: project.id,
      clientId: project.clientId,
      title: parsed.data.title,
      status: parsed.data.status,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
        },
      },
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
    action: "task.create",
    entityType: "Task",
    entityId: task.id,
    metadata: {
      title: task.title,
      status: task.status,
      dueAt: task.dueAt?.toISOString() ?? null,
      clientId: task.clientId,
      projectId: task.projectId,
      projectName: project.name,
      projectKeyPrefix: project.keyPrefix,
    },
  });

  return ok(auth.requestId, { task }, { status: 201 });
}
