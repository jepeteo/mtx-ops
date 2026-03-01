import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { normalizeReminderRules } from "@/lib/services/reminderRules";

const ReminderRulesSchema = z.array(z.number().int().min(0).max(365)).min(1).max(12);

const ServiceUpdateSchema = z
  .object({
    provider: z.string().min(1).max(120).optional(),
    type: z.enum(["DOMAIN", "HOSTING", "EMAIL", "CDN", "LICENSE", "MONITORING", "PAYMENT", "CMS", "OTHER"]).optional(),
    name: z.string().min(1).max(200).optional(),
    status: z.enum(["ACTIVE", "CANCELED", "UNKNOWN"]).optional(),
    renewalDate: z.string().datetime().optional().nullable(),
    cycle: z.string().max(60).optional().nullable(),
    costCents: z.number().int().nonnegative().optional().nullable(),
    currency: z.string().min(3).max(3).optional().nullable(),
    autoRenew: z.boolean().optional(),
    payer: z.string().max(80).optional().nullable(),
    reminderRules: ReminderRulesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

async function getScopedService(serviceId: string, workspaceId: string) {
  return db.service.findFirst({
    where: {
      id: serviceId,
      client: { workspaceId },
    },
    select: {
      id: true,
      clientId: true,
      provider: true,
      type: true,
      name: true,
      status: true,
      renewalDate: true,
      cycle: true,
      costCents: true,
      currency: true,
      autoRenew: true,
      payer: true,
      reminderRules: true,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedService(routeParams.serviceId, auth.session.workspaceId);
  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Service not found", { serviceId: routeParams.serviceId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = ServiceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid service payload", parsed.error.flatten(), 400);
  }

  const updateData: {
    provider?: string;
    type?: "DOMAIN" | "HOSTING" | "EMAIL" | "CDN" | "LICENSE" | "MONITORING" | "PAYMENT" | "CMS" | "OTHER";
    name?: string;
    status?: "ACTIVE" | "CANCELED" | "UNKNOWN";
    renewalDate?: Date | null;
    cycle?: string | null;
    costCents?: number | null;
    currency?: string | null;
    autoRenew?: boolean;
    payer?: string | null;
    reminderRules?: number[];
  } = {};

  if (parsed.data.provider !== undefined) updateData.provider = parsed.data.provider;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.renewalDate !== undefined) {
    updateData.renewalDate = parsed.data.renewalDate ? new Date(parsed.data.renewalDate) : null;
  }
  if (parsed.data.cycle !== undefined) updateData.cycle = parsed.data.cycle ?? null;
  if (parsed.data.costCents !== undefined) updateData.costCents = parsed.data.costCents ?? null;
  if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency ?? null;
  if (parsed.data.autoRenew !== undefined) updateData.autoRenew = parsed.data.autoRenew;
  if (parsed.data.payer !== undefined) updateData.payer = parsed.data.payer ?? null;
  if (parsed.data.reminderRules !== undefined) updateData.reminderRules = normalizeReminderRules(parsed.data.reminderRules);

  const service = await db.service.update({
    where: { id: existing.id },
    data: updateData,
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "service.update",
    entityType: "Service",
    entityId: service.id,
    metadata: {
      clientId: existing.clientId,
      name: service.name,
      status: service.status,
      reminderRules: service.reminderRules,
    },
  });

  return ok(auth.requestId, { service });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedService(routeParams.serviceId, auth.session.workspaceId);
  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Service not found", { serviceId: routeParams.serviceId }, 404);
  }

  await db.service.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "service.delete",
    entityType: "Service",
    entityId: existing.id,
    metadata: {
      clientId: existing.clientId,
      name: existing.name,
      provider: existing.provider,
      type: existing.type,
    },
  });

  return ok(auth.requestId, { deleted: true, serviceId: existing.id });
}
