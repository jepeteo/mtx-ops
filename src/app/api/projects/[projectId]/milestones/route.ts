import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const MilestoneStatusSchema = z.enum(["OPEN", "DONE"]);

const CreateMilestoneSchema = z.object({
  title: z.string().min(1).max(220),
  dueAt: z.string().datetime().optional().nullable(),
  status: MilestoneStatusSchema.default("OPEN"),
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

  const milestones = await db.milestone.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
      projectId: routeParams.projectId,
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });

  return ok(auth.requestId, { milestones });
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
    select: { id: true, name: true },
  });

  if (!project) {
    return fail(auth.requestId, "NOT_FOUND", "Project not found", { projectId: routeParams.projectId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid milestone payload", parsed.error.flatten(), 400);
  }

  const milestone = await db.milestone.create({
    data: {
      workspaceId: auth.session.workspaceId,
      projectId: project.id,
      title: parsed.data.title,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      status: parsed.data.status,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "milestone.create",
    entityType: "Milestone",
    entityId: milestone.id,
    metadata: {
      projectId: project.id,
      projectName: project.name,
      title: milestone.title,
      status: milestone.status,
      dueAt: milestone.dueAt?.toISOString() ?? null,
    },
  });

  return ok(auth.requestId, { milestone }, { status: 201 });
}
