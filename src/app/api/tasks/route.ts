import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const StatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(280),
  status: StatusSchema.default("TODO"),
  dueAt: z.string().datetime().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const requestUrl = new URL(req.url);
  const statusRaw = requestUrl.searchParams.get("status");
  const status = statusRaw ? StatusSchema.safeParse(statusRaw) : null;

  if (statusRaw && (!status || !status.success)) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid task status filter", { status: statusRaw }, 400);
  }

  const tasks = await db.task.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
      ...(status?.success ? { status: status.data } : {}),
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
    take: 200,
  });

  return ok(auth.requestId, { tasks });
}

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const contentType = req.headers.get("content-type") || "";

  let raw: unknown = null;
  if (contentType.includes("application/json")) {
    raw = await req.json().catch(() => null);
  } else {
    const form = await req.formData();
    raw = {
      title: form.get("title"),
      status: form.get("status") || "TODO",
      dueAt: form.get("dueAt") ? `${form.get("dueAt")}T00:00:00.000Z` : null,
      clientId: form.get("clientId") || null,
      projectId: form.get("projectId") || null,
    };
  }

  const parsed = CreateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid task payload", parsed.error.flatten(), 400);
  }

  if (parsed.data.clientId) {
    const client = await db.client.findFirst({
      where: {
        id: parsed.data.clientId,
        workspaceId: auth.session.workspaceId,
      },
      select: { id: true },
    });

    if (!client) {
      return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: parsed.data.clientId }, 404);
    }
  }

  let scopedProject: { id: string; clientId: string } | null = null;
  if (parsed.data.projectId) {
    scopedProject = await db.project.findFirst({
      where: {
        id: parsed.data.projectId,
        workspaceId: auth.session.workspaceId,
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    if (!scopedProject) {
      return fail(auth.requestId, "NOT_FOUND", "Project not found", { projectId: parsed.data.projectId }, 404);
    }

    if (parsed.data.clientId && parsed.data.clientId !== scopedProject.clientId) {
      return fail(
        auth.requestId,
        "VALIDATION_ERROR",
        "Task clientId must match selected project client",
        { clientId: parsed.data.clientId, projectId: parsed.data.projectId },
        400,
      );
    }
  }

  const task = await db.task.create({
    data: {
      workspaceId: auth.session.workspaceId,
      title: parsed.data.title,
      status: parsed.data.status,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      clientId: scopedProject?.clientId ?? parsed.data.clientId ?? null,
      projectId: scopedProject?.id ?? null,
    },
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
    },
  });

  return ok(auth.requestId, { task }, { status: 201 });
}
