import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireRoleApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const PutSchema = z.object({
  clientIds: z.array(z.string().uuid()).max(500),
});

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const user = await db.user.findFirst({
    where: { id: routeParams.userId, workspaceId: auth.session.workspaceId },
    select: { id: true, role: true, email: true },
  });
  if (!user) {
    return fail(auth.requestId, "NOT_FOUND", "User not found", { userId: routeParams.userId }, 404);
  }

  const access = await db.clientMemberAccess.findMany({
    where: { userId: user.id, workspaceId: auth.session.workspaceId },
    select: { clientId: true },
    orderBy: { createdAt: "asc" },
  });

  return ok(auth.requestId, { userId: user.id, clientIds: access.map((row) => row.clientId) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const user = await db.user.findFirst({
    where: { id: routeParams.userId, workspaceId: auth.session.workspaceId },
    select: { id: true, role: true, email: true },
  });
  if (!user) {
    return fail(auth.requestId, "NOT_FOUND", "User not found", { userId: routeParams.userId }, 404);
  }

  if (user.role !== "MEMBER") {
    return fail(auth.requestId, "VALIDATION_ERROR", "Client access applies to MEMBER users only", { role: user.role }, 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client access payload", parsed.error.flatten(), 400);
  }

  const uniqueClientIds = [...new Set(parsed.data.clientIds)];
  if (uniqueClientIds.length > 0) {
    const validCount = await db.client.count({
      where: { workspaceId: auth.session.workspaceId, id: { in: uniqueClientIds } },
    });
    if (validCount !== uniqueClientIds.length) {
      return fail(auth.requestId, "VALIDATION_ERROR", "One or more clients are invalid", undefined, 400);
    }
  }

  await db.$transaction(async (tx) => {
    await tx.clientMemberAccess.deleteMany({
      where: { userId: user.id, workspaceId: auth.session.workspaceId },
    });
    if (uniqueClientIds.length > 0) {
      await tx.clientMemberAccess.createMany({
        data: uniqueClientIds.map((clientId) => ({
          workspaceId: auth.session.workspaceId,
          clientId,
          userId: user.id,
        })),
      });
    }
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "user.client_access.update",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, clientCount: uniqueClientIds.length },
  });

  return ok(auth.requestId, { userId: user.id, clientIds: uniqueClientIds });
}
