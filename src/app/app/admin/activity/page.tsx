import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Search = {
  range?: string;
  action?: string;
  entityType?: string;
};

const RANGE_HOURS: Record<string, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  all: null,
};

function getEntityHref(entityType: string, entityId: string) {
  if (entityType === "Client") return `/app/clients/${entityId}`;
  if (entityType === "Project") return "/app/projects";
  if (entityType === "Task") return "/app/tasks";
  return null;
}

export default async function AdminActivityPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const session = await requireRole("ADMIN");
  const resolvedSearch = (await searchParams) ?? {};

  const selectedRange =
    resolvedSearch.range && Object.keys(RANGE_HOURS).includes(resolvedSearch.range)
      ? resolvedSearch.range
      : "7d";
  const actionQuery = (resolvedSearch.action ?? "").trim();
  const entityType = (resolvedSearch.entityType ?? "").trim();

  const rangeHours = RANGE_HOURS[selectedRange];
  const since = rangeHours ? new Date(Date.now() - rangeHours * 60 * 60 * 1000) : null;

  const logs = await db.activityLog.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(actionQuery ? { action: { contains: actionQuery, mode: "insensitive" } } : {}),
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const actorIds = Array.from(new Set(logs.map((log) => log.actorId)));
  const users = actorIds.length
    ? await db.user.findMany({
        where: {
          workspaceId: session.workspaceId,
          id: { in: actorIds },
        },
        select: { id: true, email: true, name: true },
      })
    : [];

  const actorMap = new Map(users.map((user) => [user.id, user.name || user.email]));
  const uniqueEntityTypes = Array.from(new Set(logs.map((log) => log.entityType))).sort();

  function buildHref(nextRange: string, nextAction: string, nextEntityType: string) {
    const params = new URLSearchParams();
    params.set("range", nextRange);
    if (nextAction) params.set("action", nextAction);
    if (nextEntityType) params.set("entityType", nextEntityType);
    return `/app/admin/activity?${params.toString()}`;
  }

  const tabClass = (active: boolean) =>
    `rounded-md border px-3 py-1 ${active ? "border-foreground bg-secondary" : "border-border"}`;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">ADMIN</div>
        <h1 className="mt-1 text-xl font-semibold">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Role-gated audit workflow for workspace activity logs.</p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link className="rounded-md border border-border px-3 py-1" href="/app/admin/users">
          Users
        </Link>
        <Link className="rounded-md border border-border px-3 py-1" href="/app/admin/operations">
          Operations
        </Link>
        <Link className="rounded-md border border-foreground bg-secondary px-3 py-1" href="/app/admin/activity">
          Activity
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Range</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(["24h", "7d", "30d", "all"] as const).map((range) => (
                <Link
                  key={range}
                  className={tabClass(selectedRange === range)}
                  href={buildHref(range, actionQuery, entityType)}
                >
                  {range}
                </Link>
              ))}
            </div>
          </div>

          <form method="get" className="grid gap-2 md:grid-cols-3 md:items-end">
            <input type="hidden" name="range" value={selectedRange} />
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Action contains</span>
              <input
                name="action"
                defaultValue={actionQuery}
                placeholder="e.g. client.update"
                className="h-9 rounded-md border border-input bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Entity type</span>
              <select name="entityType" defaultValue={entityType} className="h-9 rounded-md border border-input bg-background px-3">
                <option value="">All</option>
                {uniqueEntityTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="submit" className="rounded-md border border-border px-3 py-1 text-sm">
                Apply
              </button>
              <Link className="rounded-md border border-border px-3 py-1 text-sm" href={buildHref(selectedRange, "", "")}>Reset</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity log ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2">When</th>
                  <th className="py-2">Actor</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((event) => {
                  const entityHref = getEntityHref(event.entityType, event.entityId);
                  return (
                    <tr key={event.id} className="border-t border-border align-top">
                      <td className="py-2">{new Date(event.createdAt).toLocaleString()}</td>
                      <td className="py-2">{actorMap.get(event.actorId) || event.actorId}</td>
                      <td className="py-2 font-mono text-xs">{event.action}</td>
                      <td className="py-2">
                        {entityHref ? (
                          <Link href={entityHref} className="underline-offset-2 hover:underline">
                            {event.entityType}
                          </Link>
                        ) : (
                          event.entityType
                        )}
                        <div className="font-mono text-xs text-muted-foreground">{event.entityId}</div>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No activity found for the selected filters.
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
