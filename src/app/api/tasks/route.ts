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

  const task = await db.task.create({
    data: {
      workspaceId: auth.session.workspaceId,
      title: parsed.data.title,
      status: parsed.data.status,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      clientId: parsed.data.clientId ?? null,
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
    action: "task.create",
    entityType: "Task",
    entityId: task.id,
    metadata: {
      title: task.title,
      status: task.status,
      dueAt: task.dueAt?.toISOString() ?? null,
      clientId: task.clientId,
    },
  });

  return ok(auth.requestId, { task }, { status: 201 });
}
