import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const MilestoneStatusSchema = z.enum(["OPEN", "DONE"]);

const UpdateMilestoneSchema = z
  .object({
    title: z.string().min(1).max(220).optional(),
    dueAt: z.string().datetime().optional().nullable(),
    status: MilestoneStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

type RouteParams = { milestoneId: string };

async function getScopedMilestone(milestoneId: string, workspaceId: string) {
  return db.milestone.findFirst({
    where: {
      id: milestoneId,
      workspaceId,
    },
    select: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
      projectId: true,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedMilestone(routeParams.milestoneId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Milestone not found", { milestoneId: routeParams.milestoneId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid milestone payload", parsed.error.flatten(), 400);
  }

  const milestone = await db.milestone.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      status: parsed.data.status,
      dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "milestone.update",
    entityType: "Milestone",
    entityId: milestone.id,
    metadata: {
      previous: {
        title: existing.title,
        status: existing.status,
        dueAt: existing.dueAt?.toISOString() ?? null,
      },
      next: {
        title: milestone.title,
        status: milestone.status,
        dueAt: milestone.dueAt?.toISOString() ?? null,
      },
    },
  });

  return ok(auth.requestId, { milestone });
}

export async function DELETE(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedMilestone(routeParams.milestoneId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Milestone not found", { milestoneId: routeParams.milestoneId }, 404);
  }

  await db.milestone.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "milestone.delete",
    entityType: "Milestone",
    entityId: existing.id,
    metadata: {
      title: existing.title,
      status: existing.status,
      dueAt: existing.dueAt?.toISOString() ?? null,
      projectId: existing.projectId,
    },
  });

  return ok(auth.requestId, { deleted: true, milestoneId: existing.id });
}
