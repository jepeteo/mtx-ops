import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent } from "@/components/ui/card";

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
        where: { workspaceId: session.workspaceId, id: { in: actorIds } },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">Workspace audit log</p>
      </div>

      <nav className="tab-bar">
        <Link href="/app/admin/users">Users</Link>
        <Link href="/app/admin/operations">Operations</Link>
        <Link href="/app/admin/activity" className="active">Activity</Link>
      </nav>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-4 p-5">
          <div>
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Range</div>
            <div className="tab-bar">
              {(["24h", "7d", "30d", "all"] as const).map((range) => (
                <Link key={range} className={selectedRange === range ? "active" : ""} href={buildHref(range, actionQuery, entityType)}>{range}</Link>
              ))}
            </div>
          </div>

          <form method="get" className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <input type="hidden" name="range" value={selectedRange} />
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action contains</span>
              <input name="action" defaultValue={actionQuery} placeholder="e.g. client.update" className="form-input" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entity type</span>
              <select name="entityType" defaultValue={entityType} className="form-select">
                <option value="">All</option>
                {uniqueEntityTypes.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="submit" className="form-btn">Apply</button>
              <Link className="form-btn-outline" href={buildHref(selectedRange, "", "")}>Reset</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <div className="text-sm font-medium">Activity log ({logs.length})</div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((event) => {
                  const entityHref = getEntityHref(event.entityType, event.entityId);
                  return (
                    <tr key={event.id}>
                      <td>{new Date(event.createdAt).toLocaleString()}</td>
                      <td>{actorMap.get(event.actorId) || <code className="text-[11px] text-muted-foreground">{event.actorId}</code>}</td>
                      <td><code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{event.action}</code></td>
                      <td>
                        {entityHref ? (
                          <Link href={entityHref} className="font-medium hover:text-primary">{event.entityType}</Link>
                        ) : (
                          event.entityType
                        )}
                        <div className="text-[11px] text-muted-foreground">{event.entityId}</div>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="empty-state">No activity found for the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
