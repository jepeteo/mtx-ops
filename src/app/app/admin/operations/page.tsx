import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunAttachmentCleanupButton } from "@/components/admin/RunAttachmentCleanupButton";
import { AutoClearCleanupStatus } from "@/components/admin/AutoClearCleanupStatus";

type MetadataMap = Record<string, unknown>;

function asMetadataMap(value: unknown): MetadataMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as MetadataMap;
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getEntityHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null;

  if (entityType === "Client") {
    return `/app/clients/${entityId}`;
  }

  if (entityType === "Project") {
    return "/app/projects";
  }

  if (entityType === "Task") {
    return "/app/tasks";
  }

  return null;
}

type Search = {
  range?: string;
  view?: string;
  cleanupRun?: string;
  cleanupScanned?: string;
  cleanupDeleted?: string;
  cleanupFailed?: string;
  cleanupMessage?: string;
};

const RANGE_HOURS: Record<string, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  all: null,
};

const VIEW_OPTIONS = new Set(["all", "cleanup", "failures"]);

export default async function AdminOperationsPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const session = await requireRole("ADMIN");
  const resolvedSearch = (await searchParams) ?? {};

  const selectedRange =
    resolvedSearch.range && Object.keys(RANGE_HOURS).includes(resolvedSearch.range)
      ? resolvedSearch.range
      : "7d";
  const selectedView = resolvedSearch.view && VIEW_OPTIONS.has(resolvedSearch.view) ? resolvedSearch.view : "all";

  const cleanupRun = resolvedSearch.cleanupRun === "ok" || resolvedSearch.cleanupRun === "error" ? resolvedSearch.cleanupRun : null;
  const cleanupScanned = Number(resolvedSearch.cleanupScanned ?? "0");
  const cleanupDeleted = Number(resolvedSearch.cleanupDeleted ?? "0");
  const cleanupFailed = Number(resolvedSearch.cleanupFailed ?? "0");
  const cleanupMessage = resolvedSearch.cleanupMessage ?? "Cleanup run failed";

  const rangeHours = RANGE_HOURS[selectedRange];
  const since = rangeHours ? new Date(Date.now() - rangeHours * 60 * 60 * 1000) : null;

  const [latestCleanupLog, logs] = await Promise.all([
    db.activityLog.findFirst({
      where: {
        workspaceId: session.workspaceId,
        action: "attachment.cleanup",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.activityLog.findMany({
      where: {
        workspaceId: session.workspaceId,
        action: {
          in: ["attachment.cleanup", "attachment.unlink"],
        },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const latestCleanupMeta = asMetadataMap(latestCleanupLog?.metadata);
  const latestCleanup = latestCleanupLog
    ? {
        createdAt: latestCleanupLog.createdAt,
        actorId: latestCleanupLog.actorId,
        attachmentId: latestCleanupLog.entityId,
        fileName: getString(latestCleanupMeta.fileName) ?? "—",
      }
    : null;

  const cleanupEvents = logs
    .filter((log) => log.action === "attachment.cleanup")
    .slice(0, 100)
    .map((log) => {
      const metadata = asMetadataMap(log.metadata);
      return {
        id: log.id,
        createdAt: log.createdAt,
        attachmentId: log.entityId,
        fileName: getString(metadata.fileName) ?? "—",
        storageKey: getString(metadata.storageKey) ?? "—",
        actorId: log.actorId,
      };
    });

  const cleanupFailures = logs
    .filter((log) => log.action === "attachment.unlink")
    .map((log) => {
      const metadata = asMetadataMap(log.metadata);
      const entityType = getString(metadata.entityType);
      const entityId = getString(metadata.entityId);
      return {
        id: log.id,
        createdAt: log.createdAt,
        attachmentId: log.entityId,
        fileName: getString(metadata.fileName) ?? "—",
        storageDeleteError: getString(metadata.storageDeleteError),
        entityType,
        entityId,
        entityHref: getEntityHref(entityType, entityId),
        actorId: log.actorId,
      };
    })
    .filter((row) => Boolean(row.storageDeleteError))
    .slice(0, 100);

  const unlinkEventsInRange = logs.filter((log) => log.action === "attachment.unlink").length;
  const failureRate =
    unlinkEventsInRange > 0 ? Math.round((cleanupFailures.length / unlinkEventsInRange) * 100) : 0;

  const buildFilterHref = (range: string, view: string) => {
    const params = new URLSearchParams();
    params.set("range", range);
    params.set("view", view);
    return `/app/admin/operations?${params.toString()}`;
  };

  const clearStatusHref = buildFilterHref(selectedRange, selectedView);

  const tabClass = (active: boolean) =>
    `rounded-md border px-3 py-1 ${active ? "border-foreground bg-secondary" : "border-border"}`;

  return (
    <div className="space-y-5">
      <AutoClearCleanupStatus delayMs={10000} />

      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">ADMIN</div>
        <h1 className="mt-1 text-xl font-semibold">Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Attachment cleanup runs and storage-delete failure signals from ActivityLog.</p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link className="rounded-md border border-border px-3 py-1" href="/app/admin/users">
          Users
        </Link>
        <Link className="rounded-md border border-foreground bg-secondary px-3 py-1" href="/app/admin/operations">
          Operations
        </Link>
      </div>

      {cleanupRun === "ok" ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Cleanup completed: scanned {cleanupScanned}, deleted {cleanupDeleted}, failed {cleanupFailed}.{" "}
          <Link href={clearStatusHref} className="underline underline-offset-2">
            Clear status
          </Link>
          <span className="ml-2 text-xs text-emerald-700">Auto-clears in 10s</span>
        </div>
      ) : null}

      {cleanupRun === "error" ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          Cleanup failed: {cleanupMessage}.{" "}
          <Link href={clearStatusHref} className="underline underline-offset-2">
            Clear status
          </Link>
          <span className="ml-2 text-xs text-red-700">Auto-clears in 10s</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <RunAttachmentCleanupButton />
        </CardContent>
      </Card>

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
                  href={buildFilterHref(range, selectedView)}
                >
                  {range}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">View</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(["all", "cleanup", "failures"] as const).map((view) => (
                <Link
                  key={view}
                  className={tabClass(selectedView === view)}
                  href={buildFilterHref(selectedRange, view)}
                >
                  {view}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Cleanup Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{cleanupEvents.length}</div>
            <div className="text-xs text-muted-foreground">In selected range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Storage Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{cleanupFailures.length}</div>
            <div className="text-xs text-muted-foreground">In selected range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Failure Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{failureRate}%</div>
            <div className="text-xs text-muted-foreground">From {unlinkEventsInRange} unlink events</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Cleanup Run</CardTitle>
          </CardHeader>
          <CardContent>
            {latestCleanup ? (
              <>
                <div className="text-sm font-medium">{new Date(latestCleanup.createdAt).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{latestCleanup.fileName}</div>
                <div className="text-xs text-muted-foreground font-mono">{latestCleanup.actorId}</div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">No cleanup activity recorded yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedView === "all" || selectedView === "cleanup" ? (
      <Card>
        <CardHeader>
          <CardTitle>Attachment cleanup events ({cleanupEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2">When</th>
                  <th className="py-2">Attachment</th>
                  <th className="py-2">File</th>
                  <th className="py-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {cleanupEvents.map((event) => (
                  <tr key={event.id} className="border-t border-border align-top">
                    <td className="py-2">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{event.attachmentId}</td>
                    <td className="py-2">{event.fileName}</td>
                    <td className="py-2 font-mono text-xs">{event.actorId}</td>
                  </tr>
                ))}
                {cleanupEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No cleanup events yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {selectedView === "all" || selectedView === "failures" ? (
      <Card>
        <CardHeader>
          <CardTitle>Storage delete failures ({cleanupFailures.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2">When</th>
                  <th className="py-2">Attachment</th>
                  <th className="py-2">Entity</th>
                  <th className="py-2">Error</th>
                  <th className="py-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {cleanupFailures.map((event) => (
                  <tr key={event.id} className="border-t border-border align-top">
                    <td className="py-2">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="py-2">
                      <div className="font-mono text-xs">{event.attachmentId}</div>
                      <div className="text-muted-foreground">{event.fileName}</div>
                    </td>
                    <td className="py-2">
                      {event.entityHref && event.entityType ? (
                        <Link href={event.entityHref} className="underline-offset-2 hover:underline">
                          {event.entityType}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {event.entityId ? <div className="font-mono text-xs text-muted-foreground">{event.entityId}</div> : null}
                    </td>
                    <td className="py-2 text-red-600">{event.storageDeleteError}</td>
                    <td className="py-2 font-mono text-xs">{event.actorId}</td>
                  </tr>
                ))}
                {cleanupFailures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground">
                      No storage delete failures detected in ActivityLog.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
