import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await requireAuth();

  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [expiring7, expiring30, overdue, openNotifications] = await Promise.all([
    db.service.count({
      where: {
        client: { workspaceId: session.workspaceId },
        status: "ACTIVE",
        renewalDate: {
          gte: now,
          lte: in7Days,
        },
      },
    }),
    db.service.count({
      where: {
        client: { workspaceId: session.workspaceId },
        status: "ACTIVE",
        renewalDate: {
          gte: now,
          lte: in30Days,
        },
      },
    }),
    db.service.count({
      where: {
        client: { workspaceId: session.workspaceId },
        status: "ACTIVE",
        renewalDate: { lt: now },
      },
    }),
    db.notification.count({
      where: {
        workspaceId: session.workspaceId,
        status: { in: ["OPEN", "SNOOZED"] },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Expiring in 7 days</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{expiring7}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring in 30 days</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{expiring30}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue renewals</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{overdue}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open notifications</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{openNotifications}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>Email: {session.userEmail}</div>
          <div>Role: {session.role}</div>
          <div>Workspace: {session.workspaceId}</div>
        </CardContent>
      </Card>
    </div>
  );
}
