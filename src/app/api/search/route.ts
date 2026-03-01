import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { db } from "@/lib/db/db";

const MAX_QUERY_LENGTH = 100;

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Search query must be at least 2 characters", { q: query }, 400);
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Search query is too long", { maxLength: MAX_QUERY_LENGTH }, 400);
  }

  const [clients, projects, tasks, notes] = await Promise.all([
    db.client.findMany({
      where: {
        workspaceId: auth.session.workspaceId,
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    db.project.findMany({
      where: {
        workspaceId: auth.session.workspaceId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { keyPrefix: { contains: query.toUpperCase(), mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        updatedAt: true,
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    db.task.findMany({
      where: {
        workspaceId: auth.session.workspaceId,
        title: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        project: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
          },
        },
      },
      take: 20,
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    }),
    db.note.findMany({
      where: {
        workspaceId: auth.session.workspaceId,
        body: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        body: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return ok(auth.requestId, {
    query,
    clients,
    projects,
    tasks,
    notes,
  });
}
