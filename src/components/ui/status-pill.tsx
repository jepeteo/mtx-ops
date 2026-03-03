import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "status-pill-active",
  PAUSED: "status-pill-paused",
  ARCHIVED: "status-pill-archived",
  CANCELED: "status-pill-canceled",
  UNKNOWN: "status-pill-unknown",
  TODO: "status-pill-todo",
  IN_PROGRESS: "status-pill-in-progress",
  BLOCKED: "status-pill-blocked",
  DONE: "status-pill-done",
  OPEN: "status-pill-open",
  SNOOZED: "status-pill-snoozed",
  HANDLED: "status-pill-handled",
  COMPLETED: "status-pill-done",
  PLANNING: "status-pill-todo",
  IN_FLIGHT: "status-pill-in-progress",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("status-pill", STATUS_CLASS[status] ?? "status-pill-unknown", className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
