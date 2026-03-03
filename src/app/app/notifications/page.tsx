import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationActions } from "@/components/notifications/NotificationActions";
import { StatusPill } from "@/components/ui/status-pill";
import Link from "next/link";

type Search = {
  type?: string;
  status?: string;
};

export default async function NotificationsPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const session = await requireSession();
  const resolvedSearch = (await searchParams) ?? {};

  const allowedTypes = new Set(["RENEWAL", "TASK", "INACTIVITY", "HANDOVER"]);
  const allowedStatus = new Set(["OPEN", "SNOOZED", "HANDLED"]);

  const selectedType = resolvedSearch.type && allowedTypes.has(resolvedSearch.type) ? resolvedSearch.type : undefined;
  const selectedStatus = resolvedSearch.status && allowedStatus.has(resolvedSearch.status) ? resolvedSearch.status : undefined;

  const selectedTypeTab = selectedType ?? "ALL";
  const selectedStatusTab = selectedStatus ?? "ALL";

  const typeTabs: Array<{ value: string; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "RENEWAL", label: "Renewals" },
    { value: "TASK", label: "Task due" },
    { value: "INACTIVITY", label: "Inactivity" },
    { value: "HANDOVER", label: "Handovers" },
  ];

  const statusTabs: Array<{ value: string; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "SNOOZED", label: "Snoozed" },
    { value: "HANDLED", label: "Handled" },
  ];

  const buildHref = (nextType: string, nextStatus: string) => {
    const params = new URLSearchParams();
    if (nextType !== "ALL") params.set("type", nextType);
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    const query = params.toString();
    return query.length > 0 ? `/app/notifications?${query}` : "/app/notifications";
  };

  const [notifications, typeCountsRaw, statusCountsRaw] = await Promise.all([
    db.notification.findMany({
      where: {
        workspaceId: session.workspaceId,
        ...(selectedType ? { type: selectedType as "RENEWAL" | "TASK" | "INACTIVITY" | "HANDOVER" } : {}),
        ...(selectedStatus ? { status: selectedStatus as "OPEN" | "SNOOZED" | "HANDLED" } : {}),
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.notification.groupBy({
      by: ["type"],
      where: { workspaceId: session.workspaceId },
      _count: { _all: true },
    }),
    db.notification.groupBy({
      by: ["status"],
      where: { workspaceId: session.workspaceId },
      _count: { _all: true },
    }),
  ]);

  const typeCountMap = new Map<string, number>();
  for (const row of typeCountsRaw) typeCountMap.set(row.type, row._count._all);
  const statusCountMap = new Map<string, number>();
  for (const row of statusCountsRaw) statusCountMap.set(row.status, row._count._all);
  const allTypeCount = typeCountsRaw.reduce((sum, r) => sum + r._count._all, 0);
  const allStatusCount = statusCountsRaw.reduce((sum, r) => sum + r._count._all, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Renewals, due dates, inactivity, and handovers in one place</p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Type</div>
          <div className="tab-bar">
            {typeTabs.map((tab) => (
              <Link key={tab.value} className={selectedTypeTab === tab.value ? "active" : ""} href={buildHref(tab.value, selectedStatusTab)}>
                {tab.label} <span className="ml-0.5 text-muted-foreground">({tab.value === "ALL" ? allTypeCount : (typeCountMap.get(tab.value) ?? 0)})</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Status</div>
          <div className="tab-bar">
            {statusTabs.map((tab) => (
              <Link key={tab.value} className={selectedStatusTab === tab.value ? "active" : ""} href={buildHref(selectedTypeTab, tab.value)}>
                {tab.label} <span className="ml-0.5 text-muted-foreground">({tab.value === "ALL" ? allStatusCount : (statusCountMap.get(tab.value) ?? 0)})</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="align-top">
                    <td><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{n.type}</span></td>
                    <td>
                      <div className="font-medium">{n.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>
                    </td>
                    <td>{new Date(n.dueAt).toLocaleDateString()}</td>
                    <td><StatusPill status={n.status} /></td>
                    <td><NotificationActions notificationId={n.id} status={n.status} /></td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">No notifications yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
