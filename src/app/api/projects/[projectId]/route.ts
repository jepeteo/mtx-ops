import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const ProjectStatusSchema = z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);

const UpdateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    keyPrefix: z
      .string()
      .min(2)
      .max(16)
      .regex(/^[A-Z0-9]+$/)
      .optional(),
    status: ProjectStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

type RouteParams = { projectId: string };

async function getScopedProject(projectId: string, workspaceId: string) {
  return db.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
    },
    select: {
      id: true,
      workspaceId: true,
      clientId: true,
      name: true,
      keyPrefix: true,
      status: true,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedProject(routeParams.projectId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Project not found", { projectId: routeParams.projectId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid project payload", parsed.error.flatten(), 400);
  }

  const nextKeyPrefix = parsed.data.keyPrefix?.toUpperCase();
  if (nextKeyPrefix && nextKeyPrefix !== existing.keyPrefix) {
    const duplicate = await db.project.findFirst({
      where: {
        workspaceId: auth.session.workspaceId,
        keyPrefix: nextKeyPrefix,
        id: { not: existing.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return fail(auth.requestId, "CONFLICT", "Project keyPrefix already exists in workspace", { keyPrefix: nextKeyPrefix }, 409);
    }
  }

  const project = await db.project.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      status: parsed.data.status,
      keyPrefix: nextKeyPrefix,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "project.update",
    entityType: "Project",
    entityId: project.id,
    metadata: {
      previous: {
        name: existing.name,
        status: existing.status,
        keyPrefix: existing.keyPrefix,
      },
      next: {
        name: project.name,
        status: project.status,
        keyPrefix: project.keyPrefix,
      },
    },
  });

  return ok(auth.requestId, { project });
}

export async function DELETE(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedProject(routeParams.projectId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Project not found", { projectId: routeParams.projectId }, 404);
  }

  await db.project.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "project.delete",
    entityType: "Project",
    entityId: existing.id,
    metadata: {
      name: existing.name,
      status: existing.status,
      keyPrefix: existing.keyPrefix,
      clientId: existing.clientId,
    },
  });

  return ok(auth.requestId, { deleted: true, projectId: existing.id });
}
