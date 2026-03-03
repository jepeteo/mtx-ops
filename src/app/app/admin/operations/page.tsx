import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent } from "@/components/ui/card";
import { RunAttachmentCleanupButton } from "@/components/admin/RunAttachmentCleanupButton";
import { AutoClearCleanupStatus } from "@/components/admin/AutoClearCleanupStatus";
import { Trash2, AlertTriangle, BarChart3, Clock } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <AutoClearCleanupStatus delayMs={10000} />

      <div>
        <h1 className="text-lg font-semibold">Operations</h1>
        <p className="text-sm text-muted-foreground">Attachment cleanup runs and storage-delete failure signals</p>
      </div>

      <nav className="tab-bar">
        <Link href="/app/admin/users">Users</Link>
        <Link href="/app/admin/operations" className="active">Operations</Link>
        <Link href="/app/admin/activity">Activity</Link>
      </nav>

      {cleanupRun === "ok" && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          Cleanup completed: scanned {cleanupScanned}, deleted {cleanupDeleted}, failed {cleanupFailed}.{" "}
          <Link href={clearStatusHref} className="underline underline-offset-2">Clear status</Link>
          <span className="ml-2 text-xs opacity-75">Auto-clears in 10s</span>
        </div>
      )}

      {cleanupRun === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          Cleanup failed: {cleanupMessage}.{" "}
          <Link href={clearStatusHref} className="underline underline-offset-2">Clear status</Link>
          <span className="ml-2 text-xs opacity-75">Auto-clears in 10s</span>
        </div>
      )}

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <div className="text-sm font-medium">Manual cleanup</div>
            <div className="text-xs text-muted-foreground">Run attachment orphan cleanup now</div>
          </div>
          <RunAttachmentCleanupButton />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Range</div>
          <div className="tab-bar">
            {(["24h", "7d", "30d", "all"] as const).map((range) => (
              <Link key={range} className={selectedRange === range ? "active" : ""} href={buildFilterHref(range, selectedView)}>{range}</Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">View</div>
          <div className="tab-bar">
            {(["all", "cleanup", "failures"] as const).map((view) => (
              <Link key={view} className={selectedView === view ? "active" : ""} href={buildFilterHref(selectedRange, view)}>{view}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Cleanup Events", value: cleanupEvents.length, icon: Trash2, color: "text-primary", bg: "bg-primary/10", sub: "In selected range" },
          { label: "Storage Failures", value: cleanupFailures.length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", sub: "In selected range" },
          { label: "Failure Rate", value: `${failureRate}%`, icon: BarChart3, color: "text-warning", bg: "bg-warning/10", sub: `From ${unlinkEventsInRange} unlink events` },
          { label: "Last Cleanup", value: latestCleanup ? new Date(latestCleanup.createdAt).toLocaleDateString() : "—", icon: Clock, color: "text-info", bg: "bg-info/10", sub: latestCleanup ? latestCleanup.fileName : "No runs yet" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(selectedView === "all" || selectedView === "cleanup") && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-3">
              <div className="text-sm font-medium">Attachment cleanup events ({cleanupEvents.length})</div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Attachment</th>
                    <th>File</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanupEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.createdAt).toLocaleString()}</td>
                      <td><code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{event.attachmentId}</code></td>
                      <td>{event.fileName}</td>
                      <td><code className="text-[11px] text-muted-foreground">{event.actorId}</code></td>
                    </tr>
                  ))}
                  {cleanupEvents.length === 0 && (
                    <tr><td colSpan={4} className="empty-state">No cleanup events yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(selectedView === "all" || selectedView === "failures") && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-3">
              <div className="text-sm font-medium">Storage delete failures ({cleanupFailures.length})</div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Attachment</th>
                    <th>Entity</th>
                    <th>Error</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanupFailures.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.createdAt).toLocaleString()}</td>
                      <td>
                        <code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{event.attachmentId}</code>
                        <div className="mt-0.5 text-muted-foreground">{event.fileName}</div>
                      </td>
                      <td>
                        {event.entityHref && event.entityType ? (
                          <Link href={event.entityHref} className="font-medium hover:text-primary">{event.entityType}</Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {event.entityId && <div className="text-[11px] text-muted-foreground">{event.entityId}</div>}
                      </td>
                      <td className="text-destructive">{event.storageDeleteError}</td>
                      <td><code className="text-[11px] text-muted-foreground">{event.actorId}</code></td>
                    </tr>
                  ))}
                  {cleanupFailures.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">No storage delete failures detected.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
