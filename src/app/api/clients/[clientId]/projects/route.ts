import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const ProjectStatusSchema = z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  keyPrefix: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[A-Z0-9]+$/),
  status: ProjectStatusSchema.default("ACTIVE"),
});

export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const client = await db.client.findFirst({
    where: {
      id: routeParams.clientId,
      workspaceId: auth.session.workspaceId,
    },
    select: { id: true },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const projects = await db.project.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
      clientId: routeParams.clientId,
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  return ok(auth.requestId, { projects });
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const client = await db.client.findFirst({
    where: {
      id: routeParams.clientId,
      workspaceId: auth.session.workspaceId,
    },
    select: { id: true, name: true },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid project payload", parsed.error.flatten(), 400);
  }

  const keyPrefix = parsed.data.keyPrefix.toUpperCase();

  const existingPrefix = await db.project.findFirst({
    where: {
      workspaceId: auth.session.workspaceId,
      keyPrefix,
    },
    select: { id: true },
  });

  if (existingPrefix) {
    return fail(auth.requestId, "CONFLICT", "Project keyPrefix already exists in workspace", { keyPrefix }, 409);
  }

  const project = await db.project.create({
    data: {
      workspaceId: auth.session.workspaceId,
      clientId: client.id,
      name: parsed.data.name,
      keyPrefix,
      status: parsed.data.status,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "project.create",
    entityType: "Project",
    entityId: project.id,
    metadata: {
      clientId: client.id,
      clientName: client.name,
      name: project.name,
      keyPrefix: project.keyPrefix,
      status: project.status,
    },
  });

  return ok(auth.requestId, { project }, { status: 201 });
}
