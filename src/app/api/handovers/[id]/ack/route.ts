import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

type RouteParams = { id: string };

export async function POST(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const handover = await db.handover.findFirst({
    where: {
      id: routeParams.id,
      workspaceId: auth.session.workspaceId,
    },
  });

  if (!handover) {
    return fail(auth.requestId, "NOT_FOUND", "Handover not found", { handoverId: routeParams.id }, 404);
  }

  if (handover.status === "ACKED") {
    return ok(auth.requestId, { handover });
  }

  const updated = await db.handover.update({
    where: { id: handover.id },
    data: {
      status: "ACKED",
      ackedAt: new Date(),
      ackedById: auth.session.userId,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "handover.ack",
    entityType: "Handover",
    entityId: updated.id,
    metadata: {
      toUserId: updated.toUserId,
      fromUserId: updated.fromUserId,
      status: updated.status,
    },
  });

  return ok(auth.requestId, { handover: updated });
}
