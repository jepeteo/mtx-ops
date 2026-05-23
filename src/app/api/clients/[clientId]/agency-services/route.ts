import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { assertClientVisible } from "@/lib/clients/access";

const AgencyServiceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4_000).optional().nullable(),
  billingCadence: z.enum(["monthly", "quarterly", "annual", "ad_hoc"]),
  amountMinor: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  status: z.enum(["active", "paused", "ended"]).default("active"),
  startedAt: z.string().datetime().optional().nullable(),
  endedAt: z.string().datetime().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const visible = await assertClientVisible({
    clientId: routeParams.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const client = await db.client.findFirst({
    where: { id: routeParams.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true },
  });
  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const agencyServices = await db.agencyService.findMany({
    where: { clientId: routeParams.clientId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return ok(auth.requestId, { agencyServices });
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const visible = await assertClientVisible({
    clientId: routeParams.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const client = await db.client.findFirst({
    where: { id: routeParams.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true },
  });
  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = AgencyServiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid agency service payload", parsed.error.flatten(), 400);
  }

  if (parsed.data.projectId) {
    const project = await db.project.findFirst({
      where: {
        id: parsed.data.projectId,
        workspaceId: auth.session.workspaceId,
        clientId: routeParams.clientId,
      },
      select: { id: true },
    });
    if (!project) {
      return fail(auth.requestId, "NOT_FOUND", "Project not found for this client", { projectId: parsed.data.projectId }, 404);
    }
  }

  const agencyService = await db.agencyService.create({
    data: {
      clientId: routeParams.clientId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      billingCadence: parsed.data.billingCadence,
      amountMinor: parsed.data.amountMinor ?? null,
      currency: parsed.data.currency?.toUpperCase() ?? null,
      status: parsed.data.status,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      projectId: parsed.data.projectId ?? null,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "agency_service.create",
    entityType: "AgencyService",
    entityId: agencyService.id,
    metadata: { clientId: routeParams.clientId, name: agencyService.name, status: agencyService.status },
  });

  return ok(auth.requestId, { agencyService }, { status: 201 });
}
