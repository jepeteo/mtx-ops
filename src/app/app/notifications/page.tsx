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

  const notifications = await db.notification.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(selectedType ? { type: selectedType as "RENEWAL" | "TASK" | "INACTIVITY" | "HANDOVER" } : {}),
      ...(selectedStatus ? { status: selectedStatus as "OPEN" | "SNOOZED" | "HANDLED" } : {}),
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

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
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Link className="rounded-md border border-border px-2 py-1" href="/app/notifications">
              All
            </Link>
            <Link className="rounded-md border border-border px-2 py-1" href="/app/notifications?type=RENEWAL">
              Renewals
            </Link>
            <Link className="rounded-md border border-border px-2 py-1" href="/app/notifications?type=INACTIVITY">
              Inactivity
            </Link>
            <Link className="rounded-md border border-border px-2 py-1" href="/app/notifications?type=TASK">
              Task due
            </Link>
            <Link className="rounded-md border border-border px-2 py-1" href="/app/notifications?status=OPEN">
              Open
            </Link>
            <Link className="rounded-md border border-border px-2 py-1" href="/app/notifications?status=HANDLED">
              Handled
            </Link>
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
