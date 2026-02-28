import { requireSession } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotificationsPage() {
  await requireSession();

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
          <CardDescription>This is the UI shell. Hook it to the Notification table + cron in Phase 7.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Coming in Phase 7:
            <ul className="mt-2 list-disc pl-5">
              <li>Tabs: All / Renewals / Tasks / Inactivity / Handovers</li>
              <li>Actions: Snooze, Mark handled, Jump to entity</li>
              <li>Unread count + dashboard summary</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
