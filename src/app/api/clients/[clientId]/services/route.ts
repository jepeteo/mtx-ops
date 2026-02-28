import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const ServiceCreateSchema = z.object({
  provider: z.string().min(1).max(120),
  type: z.enum(["DOMAIN", "HOSTING", "EMAIL", "CDN", "LICENSE", "MONITORING", "PAYMENT", "CMS", "OTHER"]),
  name: z.string().min(1).max(200),
  status: z.enum(["ACTIVE", "CANCELED", "UNKNOWN"]).default("ACTIVE"),
  renewalDate: z.string().datetime().optional().nullable(),
  cycle: z.string().max(60).optional().nullable(),
  costCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  autoRenew: z.boolean().default(false),
  payer: z.string().max(80).optional().nullable(),
  reminderRules: z.array(z.number().int().nonnegative()).default([60, 30, 14, 7]),
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

  const services = await db.service.findMany({
    where: { clientId: routeParams.clientId },
    orderBy: [{ renewalDate: "asc" }, { createdAt: "desc" }],
  });

  return ok(auth.requestId, { services });
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
    select: { id: true },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = ServiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid service payload", parsed.error.flatten(), 400);
  }

  const service = await db.service.create({
    data: {
      clientId: routeParams.clientId,
      provider: parsed.data.provider,
      type: parsed.data.type,
      name: parsed.data.name,
      status: parsed.data.status,
      renewalDate: parsed.data.renewalDate ? new Date(parsed.data.renewalDate) : null,
      cycle: parsed.data.cycle ?? null,
      costCents: parsed.data.costCents ?? null,
      currency: parsed.data.currency ?? null,
      autoRenew: parsed.data.autoRenew,
      payer: parsed.data.payer ?? null,
      reminderRules: parsed.data.reminderRules,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "service.create",
    entityType: "Service",
    entityId: service.id,
    metadata: {
      clientId: routeParams.clientId,
      provider: service.provider,
      type: service.type,
      name: service.name,
    },
  });

  return ok(auth.requestId, { service }, { status: 201 });
}
