import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const notification = await db.notification.findFirst({
    where: {
      id: routeParams.id,
      workspaceId: auth.session.workspaceId,
    },
    select: { id: true },
  });

  if (!notification) {
    return fail(auth.requestId, "NOT_FOUND", "Notification not found", { id: routeParams.id }, 404);
  }

  const updated = await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "HANDLED",
      handledAt: new Date(),
      handledById: auth.session.userId,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "notification.mark_handled",
    entityType: "Notification",
    entityId: updated.id,
    metadata: {},
  });

  return ok(auth.requestId, { notification: updated });
}
