import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { assertClientVisible } from "@/lib/clients/access";

const AgencyServiceUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(4_000).optional().nullable(),
    billingCadence: z.enum(["monthly", "quarterly", "annual", "ad_hoc"]).optional(),
    amountMinor: z.number().int().nonnegative().optional().nullable(),
    currency: z.string().min(3).max(3).optional().nullable(),
    status: z.enum(["active", "paused", "ended"]).optional(),
    startedAt: z.string().datetime().optional().nullable(),
    endedAt: z.string().datetime().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

async function getScopedAgencyService(agencyServiceId: string, workspaceId: string) {
  return db.agencyService.findFirst({
    where: {
      id: agencyServiceId,
      client: { workspaceId },
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ agencyServiceId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedAgencyService(routeParams.agencyServiceId, auth.session.workspaceId);
  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Agency service not found", { agencyServiceId: routeParams.agencyServiceId }, 404);
  }

  const visible = await assertClientVisible({
    clientId: existing.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Agency service not found", { agencyServiceId: routeParams.agencyServiceId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = AgencyServiceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid agency service payload", parsed.error.flatten(), 400);
  }

  if (parsed.data.projectId) {
    const project = await db.project.findFirst({
      where: {
        id: parsed.data.projectId,
        workspaceId: auth.session.workspaceId,
        clientId: existing.clientId,
      },
      select: { id: true },
    });
    if (!project) {
      return fail(auth.requestId, "NOT_FOUND", "Project not found for this client", { projectId: parsed.data.projectId }, 404);
    }
  }

  const agencyService = await db.agencyService.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.billingCadence !== undefined ? { billingCadence: parsed.data.billingCadence } : {}),
      ...(parsed.data.amountMinor !== undefined ? { amountMinor: parsed.data.amountMinor } : {}),
      ...(parsed.data.currency !== undefined
        ? { currency: parsed.data.currency ? parsed.data.currency.toUpperCase() : null }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.startedAt !== undefined
        ? { startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null }
        : {}),
      ...(parsed.data.endedAt !== undefined
        ? { endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null }
        : {}),
      ...(parsed.data.projectId !== undefined ? { projectId: parsed.data.projectId } : {}),
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "agency_service.update",
    entityType: "AgencyService",
    entityId: agencyService.id,
    metadata: { clientId: existing.clientId, name: agencyService.name, status: agencyService.status },
  });

  return ok(auth.requestId, { agencyService });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ agencyServiceId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedAgencyService(routeParams.agencyServiceId, auth.session.workspaceId);
  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Agency service not found", { agencyServiceId: routeParams.agencyServiceId }, 404);
  }

  const visible = await assertClientVisible({
    clientId: existing.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Agency service not found", { agencyServiceId: routeParams.agencyServiceId }, 404);
  }

  await db.agencyService.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "agency_service.delete",
    entityType: "AgencyService",
    entityId: existing.id,
    metadata: { clientId: existing.clientId, name: existing.name },
  });

  return ok(auth.requestId, { deleted: true, agencyServiceId: existing.id });
}
