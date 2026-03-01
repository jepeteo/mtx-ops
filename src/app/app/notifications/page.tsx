import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationActions } from "@/components/notifications/NotificationActions";
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

  const typeTabs: Array<{ value: "ALL" | "RENEWAL" | "TASK" | "INACTIVITY" | "HANDOVER"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "RENEWAL", label: "Renewals" },
    { value: "TASK", label: "Task due" },
    { value: "INACTIVITY", label: "Inactivity" },
    { value: "HANDOVER", label: "Handovers" },
  ];

  const statusTabs: Array<{ value: "ALL" | "OPEN" | "SNOOZED" | "HANDLED"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "SNOOZED", label: "Snoozed" },
    { value: "HANDLED", label: "Handled" },
  ];

  const tabClass = (active: boolean) =>
    `rounded-md border px-2 py-1 text-xs ${active ? "border-foreground bg-secondary text-foreground" : "border-border text-muted-foreground"}`;

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
  for (const row of typeCountsRaw) {
    typeCountMap.set(row.type, row._count._all);
  }

  const statusCountMap = new Map<string, number>();
  for (const row of statusCountsRaw) {
    statusCountMap.set(row.status, row._count._all);
  }

  const allTypeCount = typeCountsRaw.reduce((sum, row) => sum + row._count._all, 0);
  const allStatusCount = statusCountsRaw.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">INBOX</div>
        <h1 className="mt-1 text-xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Renewals, due dates, inactivity, and handovers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Center</CardTitle>
          <CardDescription>Renewals, due dates, inactivity, and handovers in one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</div>
              <div className="flex flex-wrap gap-2">
                {typeTabs.map((tab) => (
                  <Link
                    key={tab.value}
                    className={tabClass(selectedTypeTab === tab.value)}
                    href={buildHref(tab.value, selectedStatusTab)}
                  >
                    {tab.label} ({tab.value === "ALL" ? allTypeCount : (typeCountMap.get(tab.value) ?? 0)})
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</div>
              <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => (
                  <Link
                    key={tab.value}
                    className={tabClass(selectedStatusTab === tab.value)}
                    href={buildHref(selectedTypeTab, tab.value)}
                  >
                    {tab.label} ({tab.value === "ALL" ? allStatusCount : (statusCountMap.get(tab.value) ?? 0)})
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2">Type</th>
                  <th className="py-2">Title</th>
                  <th className="py-2">Due</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id} className="border-t border-border align-top">
                    <td className="py-2">{notification.type}</td>
                    <td className="py-2">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-muted-foreground">{notification.message}</div>
                    </td>
                    <td className="py-2">{new Date(notification.dueAt).toLocaleDateString()}</td>
                    <td className="py-2">{notification.status}</td>
                    <td className="py-2">
                      <NotificationActions notificationId={notification.id} status={notification.status} />
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground">
                      No notifications yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
