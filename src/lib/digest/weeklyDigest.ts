import { db } from "@/lib/db/db";
import {
  getWorkspaceSettingsWithDefaults,
  parseWorkspaceSettingsJson,
} from "@/lib/workspace/workspaceSettings";

export type WeeklyDigestRenewal = {
  id: string;
  name: string;
  provider: string;
  renewalDate: string;
  clientId: string;
  clientName: string;
};

export type WeeklyDigestInvoice = {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  totalMinor: number;
  currency: string;
  overdueDays: number;
};

export type WeeklyDigestHandover = {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  createdAt: string;
};

export type WeeklyDigestTask = {
  id: string;
  title: string;
  dueAt: string;
  clientId: string | null;
  clientName: string | null;
  status: string;
};

export type WeeklyDigestInactiveClient = {
  id: string;
  name: string;
  inactiveDays: number;
  lastActivityAt: string;
};

export type WeeklyDigestData = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  renewalsNext7Days: WeeklyDigestRenewal[];
  overdueSentInvoices: WeeklyDigestInvoice[];
  unacknowledgedHandovers: WeeklyDigestHandover[];
  tasksDueNext7Days: WeeklyDigestTask[];
  inactiveClients: WeeklyDigestInactiveClient[];
};

function daysUntil(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86_400_000);
}

export async function buildWeeklyDigest(workspaceId: string, now = new Date()): Promise<WeeklyDigestData> {
  const periodEnd = new Date(now);
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);

  const renewalsBefore = new Date(now);
  renewalsBefore.setUTCDate(renewalsBefore.getUTCDate() + 7);

  const tasksDueBefore = new Date(now);
  tasksDueBefore.setUTCDate(tasksDueBefore.getUTCDate() + 7);

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId },
    select: { settings: true },
  });
  const inactivityThresholdDays = getWorkspaceSettingsWithDefaults(
    parseWorkspaceSettingsJson(workspace?.settings),
  ).general.inactivityThresholdDays;

  const [renewals, overdueInvoices, handovers, tasksDue, clients] = await Promise.all([
    db.service.findMany({
      where: {
        status: "ACTIVE",
        renewalDate: { gte: now, lte: renewalsBefore },
        client: { workspaceId, status: "ACTIVE" },
      },
      select: {
        id: true,
        name: true,
        provider: true,
        renewalDate: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { renewalDate: "asc" },
      take: 100,
    }),
    db.invoice.findMany({
      where: {
        workspaceId,
        status: "sent",
        dueDate: { lt: now },
      },
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        clientId: true,
        totalMinor: true,
        currency: true,
        client: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    }),
    db.handover.findMany({
      where: {
        workspaceId,
        status: "OPEN",
        entityType: "Client",
      },
      select: {
        id: true,
        title: true,
        entityId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.task.findMany({
      where: {
        workspaceId,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueAt: { gte: now, lte: tasksDueBefore },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        status: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 100,
    }),
    db.client.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, updatedAt: true },
    }),
  ]);

  const clientIds = clients.map((c) => c.id);
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const latestByClient = new Map<string, Date>();
  for (const client of clients) {
    latestByClient.set(client.id, client.updatedAt);
  }

  if (clientIds.length > 0) {
    const [activityRows, serviceRows] = await Promise.all([
      db.activityLog.groupBy({
        by: ["entityId"],
        where: { workspaceId, entityType: "Client", entityId: { in: clientIds } },
        _max: { createdAt: true },
      }),
      db.service.groupBy({
        by: ["clientId"],
        where: { clientId: { in: clientIds } },
        _max: { updatedAt: true },
      }),
    ]);
    for (const row of activityRows) {
      const existing = latestByClient.get(row.entityId);
      const candidate = row._max.createdAt;
      if (candidate && (!existing || candidate > existing)) {
        latestByClient.set(row.entityId, candidate);
      }
    }
    for (const row of serviceRows) {
      const existing = latestByClient.get(row.clientId);
      const candidate = row._max.updatedAt;
      if (candidate && (!existing || candidate > existing)) {
        latestByClient.set(row.clientId, candidate);
      }
    }
  }

  const inactiveClients: WeeklyDigestInactiveClient[] = [];
  for (const client of clients) {
    const lastActivityAt = latestByClient.get(client.id) ?? client.updatedAt;
    const inactiveDays = daysUntil(lastActivityAt, now);
    if (inactiveDays >= inactivityThresholdDays) {
      inactiveClients.push({
        id: client.id,
        name: client.name,
        inactiveDays,
        lastActivityAt: lastActivityAt.toISOString(),
      });
    }
  }

  inactiveClients.sort((a, b) => b.inactiveDays - a.inactiveDays);

  return {
    generatedAt: now.toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    renewalsNext7Days: renewals
      .filter((s) => s.renewalDate)
      .map((s) => ({
        id: s.id,
        name: s.name,
        provider: s.provider,
        renewalDate: s.renewalDate!.toISOString(),
        clientId: s.clientId,
        clientName: s.client.name,
      })),
    overdueSentInvoices: overdueInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate.toISOString(),
      clientId: inv.clientId,
      clientName: inv.client.name,
      totalMinor: inv.totalMinor,
      currency: inv.currency,
      overdueDays: -daysUntil(now, inv.dueDate),
    })),
    unacknowledgedHandovers: handovers.map((h) => ({
      id: h.id,
      title: h.title,
      clientId: h.entityId,
      clientName: clientNameById.get(h.entityId) ?? "Unknown client",
      createdAt: h.createdAt.toISOString(),
    })),
    tasksDueNext7Days: tasksDue
      .filter((t) => t.dueAt)
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueAt: t.dueAt!.toISOString(),
        clientId: t.clientId,
        clientName: t.client?.name ?? null,
        status: t.status,
      })),
    inactiveClients: inactiveClients.slice(0, 50),
  };
}

export function formatWeeklyDigestText(digest: WeeklyDigestData, workspaceName: string): string {
  const lines: string[] = [
    `MTX Ops weekly digest — ${workspaceName}`,
    `Generated ${digest.generatedAt.slice(0, 10)}`,
    "",
  ];

  const section = (title: string, items: string[]) => {
    lines.push(title);
    if (items.length === 0) lines.push("  (none)");
    else items.forEach((item) => lines.push(`  • ${item}`));
    lines.push("");
  };

  section(
    `Renewals in the next 7 days (${digest.renewalsNext7Days.length})`,
    digest.renewalsNext7Days.map(
      (r) => `${r.clientName} · ${r.name} (${r.provider}) — ${r.renewalDate.slice(0, 10)}`,
    ),
  );
  section(
    `Overdue sent invoices (${digest.overdueSentInvoices.length})`,
    digest.overdueSentInvoices.map(
      (i) => `${i.clientName} · ${i.invoiceNumber} — ${i.overdueDays}d overdue`,
    ),
  );
  section(
    `Unacknowledged handovers (${digest.unacknowledgedHandovers.length})`,
    digest.unacknowledgedHandovers.map((h) => `${h.clientName} · ${h.title}`),
  );
  section(
    `Tasks due in the next 7 days (${digest.tasksDueNext7Days.length})`,
    digest.tasksDueNext7Days.map(
      (t) =>
        `${t.clientName ? `${t.clientName} · ` : ""}${t.title} — due ${t.dueAt.slice(0, 10)}`,
    ),
  );
  section(
    `Inactive clients (${digest.inactiveClients.length})`,
    digest.inactiveClients.map((c) => `${c.name} — ${c.inactiveDays}d without activity`),
  );

  return lines.join("\n");
}
