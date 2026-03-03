import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { AlertTriangle, Clock, CalendarClock, Bell, ArrowRight } from "lucide-react";

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

  const stats = [
    { label: "Expiring in 7 days", value: expiring7, icon: Clock, color: "text-warning", bg: "bg-warning/10", href: "/app/notifications" },
    { label: "Expiring in 30 days", value: expiring30, icon: CalendarClock, color: "text-info", bg: "bg-info/10", href: "/app/notifications" },
    { label: "Overdue renewals", value: overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", href: "/app/notifications" },
    { label: "Open notifications", value: openNotifications, icon: Bell, color: "text-primary", bg: "bg-primary/10", href: "/app/notifications" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your workspace health</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="group transition-colors hover:border-primary/30">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.label}</div>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick links</CardTitle>
            <CardDescription>Jump to common views</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { label: "Clients", href: "/app/clients" },
              { label: "Projects", href: "/app/projects" },
              { label: "Tasks", href: "/app/tasks" },
              { label: "Search", href: "/app/search" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Session</CardTitle>
            <CardDescription>Current authentication details</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {[
                { dt: "Email", dd: session.userEmail },
                { dt: "Role", dd: session.role },
                { dt: "Workspace", dd: session.workspaceId },
              ].map((item) => (
                <div key={item.dt} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{item.dt}</dt>
                  <dd className="font-mono text-xs">{item.dd}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
