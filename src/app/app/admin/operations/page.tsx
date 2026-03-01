import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetadataMap = Record<string, unknown>;

function asMetadataMap(value: unknown): MetadataMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as MetadataMap;
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export default async function AdminOperationsPage() {
  const session = await requireRole("ADMIN");

  const logs = await db.activityLog.findMany({
    where: {
      workspaceId: session.workspaceId,
      action: {
        in: ["attachment.cleanup", "attachment.unlink"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

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
      return {
        id: log.id,
        createdAt: log.createdAt,
        attachmentId: log.entityId,
        fileName: getString(metadata.fileName) ?? "—",
        storageDeleteError: getString(metadata.storageDeleteError),
        actorId: log.actorId,
      };
    })
    .filter((row) => Boolean(row.storageDeleteError))
    .slice(0, 100);

  return (
    <div className="space-y-5">
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
                    <td className="py-2 text-red-600">{event.storageDeleteError}</td>
                    <td className="py-2 font-mono text-xs">{event.actorId}</td>
                  </tr>
                ))}
                {cleanupFailures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No storage delete failures detected in ActivityLog.
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
