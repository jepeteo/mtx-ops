import { db } from "@/lib/db/db";
import { env } from "@/lib/env";
import { fail, getRequestId, logServerError, ok } from "@/lib/http/responses";

const DEFAULT_RULES = [60, 30, 14, 7];
const INACTIVITY_DAYS = 30;

function toUtcDayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function daysUntil(fromDate: Date, toDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toUtcDayStart(toDate).getTime() - toUtcDayStart(fromDate).getTime()) / msPerDay);
}

function parseReminderRules(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_RULES;
  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0);
  return parsed.length > 0 ? parsed : DEFAULT_RULES;
}

/**
 * Called by Vercel cron every 6 hours (see vercel.json).
 */
export async function GET(req: Request) {
  const requestId = getRequestId(req);

  if (env.CRON_SECRET) {
    const headerSecret = req.headers.get("x-cron-secret");
    const authorization = req.headers.get("authorization") ?? "";
    const bearerSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    const isValid = headerSecret === env.CRON_SECRET || bearerSecret === env.CRON_SECRET;
    if (!isValid) {
      return fail(requestId, "FORBIDDEN", "Invalid cron secret", undefined, 403);
    }
  }

  try {
    const services = await db.service.findMany({
      where: {
        status: "ACTIVE",
        renewalDate: { not: null },
        client: { status: "ACTIVE" },
      },
      select: {
        id: true,
        name: true,
        provider: true,
        renewalDate: true,
        reminderRules: true,
        clientId: true,
        client: {
          select: {
            workspaceId: true,
            name: true,
          },
        },
      },
    });

    const now = new Date();
    const newNotifications: Array<{
      workspaceId: string;
      type: "RENEWAL" | "INACTIVITY";
      status: "OPEN";
      entityType: string;
      entityId: string;
      title: string;
      message: string;
      dueAt: Date;
      dedupeKey: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const service of services) {
      if (!service.renewalDate) continue;

      const rules = parseReminderRules(service.reminderRules);
      const remainingDays = daysUntil(now, service.renewalDate);

      if (!rules.includes(remainingDays)) continue;

      const dueAtDay = toUtcDayStart(service.renewalDate).toISOString().slice(0, 10);
      const dedupeKey = `renewal:${service.id}:${remainingDays}:${dueAtDay}`;

      newNotifications.push({
        workspaceId: service.client.workspaceId,
        type: "RENEWAL",
        status: "OPEN",
        entityType: "Service",
        entityId: service.id,
        title: `Renewal in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`,
        message: `${service.client.name} · ${service.name} (${service.provider}) renews on ${service.renewalDate.toISOString().slice(0, 10)}.`,
        dueAt: service.renewalDate,
        dedupeKey,
        metadata: {
          clientId: service.clientId,
          clientName: service.client.name,
          serviceName: service.name,
          provider: service.provider,
          remainingDays,
        },
      });
    }

    const clients = await db.client.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        updatedAt: true,
      },
    });

    const clientIds = clients.map((client) => client.id);
    const recentClientActivity =
      clientIds.length > 0
        ? await db.activityLog.findMany({
            where: {
              entityType: "Client",
              entityId: { in: clientIds },
            },
            orderBy: { createdAt: "desc" },
            select: {
              entityId: true,
              createdAt: true,
            },
          })
        : [];

    const latestByClient = new Map<string, Date>();
    for (const activity of recentClientActivity) {
      if (!latestByClient.has(activity.entityId)) {
        latestByClient.set(activity.entityId, activity.createdAt);
      }
    }

    for (const client of clients) {
      const lastActivityAt = latestByClient.get(client.id) ?? client.updatedAt;
      const inactiveDays = daysUntil(lastActivityAt, now);

      if (inactiveDays < INACTIVITY_DAYS) continue;

      const dedupeDay = toUtcDayStart(now).toISOString().slice(0, 10);
      const dedupeKey = `inactivity:${client.id}:${dedupeDay}`;

      newNotifications.push({
        workspaceId: client.workspaceId,
        type: "INACTIVITY",
        status: "OPEN",
        entityType: "Client",
        entityId: client.id,
        title: `Client inactive for ${inactiveDays} days`,
        message: `${client.name} has no recorded client activity in the last ${inactiveDays} days.`,
        dueAt: now,
        dedupeKey,
        metadata: {
          clientId: client.id,
          clientName: client.name,
          inactiveDays,
        },
      });
    }

    if (newNotifications.length > 0) {
      await db.notification.createMany({
        data: newNotifications,
        skipDuplicates: true,
      });
    }

    return ok(requestId, {
      generated: newNotifications.length,
      message: "Renewal notifications processed",
    });
  } catch (error) {
    logServerError({
      requestId,
      code: "INTERNAL",
      message: "Notification cron failed",
      error,
    });

    return fail(requestId, "INTERNAL", "Notification cron failed", undefined, 500);
  }
}
