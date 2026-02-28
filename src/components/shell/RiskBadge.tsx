import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RiskLevel = "ok" | "warning" | "danger" | "unknown";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const label =
    level === "ok" ? "OK" : level === "warning" ? "Expiring" : level === "danger" ? "Overdue" : "Unknown";

  // keep colors subtle & serious (no neon). Use opacity and borders.
  const variant = level === "ok" ? "subtle" : level === "unknown" ? "subtle" : "default";

  return (
    <Badge
      variant={variant}
      className={cn(
        "border-border bg-secondary/40 text-foreground",
        level === "danger" && "bg-secondary/60",
        className
      )}
      aria-label={label}
    >
      {label}
    </Badge>
  );
}
