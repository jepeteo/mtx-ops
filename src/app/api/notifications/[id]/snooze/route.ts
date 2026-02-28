import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const SnoozeSchema = z.object({
  minutes: z.number().int().positive().max(60 * 24 * 14).default(60 * 24),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = SnoozeSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid snooze payload", parsed.error.flatten(), 400);
  }

  const notification = await db.notification.findFirst({
    where: {
      id: routeParams.id,
      workspaceId: auth.session.workspaceId,
    },
    select: { id: true, entityId: true },
  });

  if (!notification) {
    return fail(auth.requestId, "NOT_FOUND", "Notification not found", { id: routeParams.id }, 404);
  }

  const snoozedUntil = new Date(Date.now() + parsed.data.minutes * 60 * 1000);

  const updated = await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SNOOZED",
      snoozedUntil,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "notification.snooze",
    entityType: "Notification",
    entityId: updated.id,
    metadata: { snoozedUntil: snoozedUntil.toISOString() },
  });

  return ok(auth.requestId, { notification: updated });
}
