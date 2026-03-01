import { db } from "@/lib/db/db";
import { env } from "@/lib/env";
import { fail, getRequestId, logServerError, ok } from "@/lib/http/responses";
import {
  buildInactivityDedupeKey,
  buildRenewalDedupeKey,
  buildTaskDueDedupeKey,
  daysUntil,
  INACTIVITY_THRESHOLD_DAYS,
  parseReminderRules,
  TASK_DUE_REMINDER_DAYS,
} from "@/lib/notifications/renewals";

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
      type: "RENEWAL" | "INACTIVITY" | "TASK";
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

      const dedupeKey = buildRenewalDedupeKey(service.id, remainingDays, service.renewalDate);

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

    const tasks = await db.task.findMany({
      where: {
        status: {
          in: ["TODO", "IN_PROGRESS", "BLOCKED"],
        },
        dueAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        status: true,
        workspaceId: true,
        clientId: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    for (const task of tasks) {
      if (!task.dueAt) continue;

      const remainingDays = daysUntil(now, task.dueAt);
      const isReminderDay = TASK_DUE_REMINDER_DAYS.includes(remainingDays as (typeof TASK_DUE_REMINDER_DAYS)[number]);
      const isFirstOverdueDay = remainingDays === -1;

      if (!isReminderDay && !isFirstOverdueDay) continue;

      const dedupeKey = buildTaskDueDedupeKey(task.id, remainingDays, task.dueAt);
      const dueDateLabel = task.dueAt.toISOString().slice(0, 10);
      const title =
        remainingDays < 0
          ? `Task overdue by ${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? "" : "s"}`
          : remainingDays === 0
            ? "Task due today"
            : `Task due in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`;

      newNotifications.push({
        workspaceId: task.workspaceId,
        type: "TASK",
        status: "OPEN",
        entityType: "Task",
        entityId: task.id,
        title,
        message: task.client?.name
          ? `${task.client.name} · ${task.title} is due on ${dueDateLabel}.`
          : `${task.title} is due on ${dueDateLabel}.`,
        dueAt: task.dueAt,
        dedupeKey,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          dueAt: task.dueAt.toISOString(),
          remainingDays,
          clientId: task.clientId,
          clientName: task.client?.name ?? null,
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
    const latestByClient = new Map<string, Date>();
    for (const client of clients) {
      latestByClient.set(client.id, client.updatedAt);
    }

    const mergeLatestDate = (clientId: string, candidate: Date | null | undefined) => {
      if (!candidate) return;
      const existing = latestByClient.get(clientId);
      if (!existing || candidate > existing) {
        latestByClient.set(clientId, candidate);
      }
    };

    if (clientIds.length > 0) {
      const [
        clientActivity,
        serviceActivity,
        projectActivity,
        taskActivity,
        assetActivity,
        vaultActivity,
        noteActivity,
        decisionActivity,
        handoverActivity,
        attachmentLinkActivity,
      ] = await Promise.all([
        db.activityLog.groupBy({
          by: ["entityId"],
          where: {
            entityType: "Client",
            entityId: { in: clientIds },
          },
          _max: { createdAt: true },
        }),
        db.service.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _max: { updatedAt: true },
        }),
        db.project.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _max: { updatedAt: true },
        }),
        db.task.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _max: { updatedAt: true },
        }),
        db.assetLink.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _max: { updatedAt: true },
        }),
        db.vaultPointer.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _max: { updatedAt: true },
        }),
        db.note.groupBy({
          by: ["entityId"],
          where: {
            entityType: "Client",
            entityId: { in: clientIds },
          },
          _max: { updatedAt: true },
        }),
        db.decision.groupBy({
          by: ["entityId"],
          where: {
            entityType: "Client",
            entityId: { in: clientIds },
          },
          _max: { updatedAt: true },
        }),
        db.handover.groupBy({
          by: ["entityId"],
          where: {
            entityType: "Client",
            entityId: { in: clientIds },
          },
          _max: { updatedAt: true },
        }),
        db.attachmentLink.groupBy({
          by: ["entityId"],
          where: {
            entityType: "Client",
            entityId: { in: clientIds },
          },
          _max: { createdAt: true },
        }),
      ]);

      for (const row of clientActivity) {
        mergeLatestDate(row.entityId, row._max.createdAt);
      }

      for (const row of serviceActivity) {
        mergeLatestDate(row.clientId, row._max.updatedAt);
      }

      for (const row of projectActivity) {
        mergeLatestDate(row.clientId, row._max.updatedAt);
      }

      for (const row of taskActivity) {
        if (!row.clientId) continue;
        mergeLatestDate(row.clientId, row._max.updatedAt);
      }

      for (const row of assetActivity) {
        mergeLatestDate(row.clientId, row._max.updatedAt);
      }

      for (const row of vaultActivity) {
        mergeLatestDate(row.clientId, row._max.updatedAt);
      }

      for (const row of noteActivity) {
        mergeLatestDate(row.entityId, row._max.updatedAt);
      }

      for (const row of decisionActivity) {
        mergeLatestDate(row.entityId, row._max.updatedAt);
      }

      for (const row of handoverActivity) {
        mergeLatestDate(row.entityId, row._max.updatedAt);
      }

      for (const row of attachmentLinkActivity) {
        mergeLatestDate(row.entityId, row._max.createdAt);
      }
    }

    for (const client of clients) {
      const lastActivityAt = latestByClient.get(client.id) ?? client.updatedAt;
      const inactiveDays = daysUntil(lastActivityAt, now);

      if (inactiveDays < INACTIVITY_THRESHOLD_DAYS) continue;

      const dedupeKey = buildInactivityDedupeKey(client.id, inactiveDays);

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
          lastActivityAt: lastActivityAt.toISOString(),
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
      message: "Renewal, task due, and inactivity notifications processed",
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
