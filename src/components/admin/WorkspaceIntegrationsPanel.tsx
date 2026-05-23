"use client";

import type { IntegrationStatus } from "@/lib/workspace/workspaceSettings";
import { useWorkspaceSettings } from "./WorkspaceSettingsShell";

const INTEGRATIONS: Array<{ key: keyof IntegrationStatus; label: string; description: string }> = [
  { key: "database", label: "Database", description: "Neon Postgres (required for the app)" },
  { key: "storage", label: "Storage", description: "S3-compatible object storage for attachments and logos" },
  { key: "vault", label: "Vaultwarden", description: "Credential vault integration" },
  { key: "email", label: "Email (Resend)", description: "Invoice email sending via Resend" },
  { key: "upstash", label: "Upstash Redis", description: "Rate limiting and caching" },
];

export function WorkspaceIntegrationsPanel() {
  const { loading, error, data } = useWorkspaceSettings();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading integrations…</p>;
  }

  if (error) {
    return <p className="text-sm font-medium text-destructive">{error}</p>;
  }

  const integrations = data?.integrations;

  return (
    <div className="grid max-w-2xl gap-4">
      <p className="text-sm text-muted-foreground">Managed in Vercel environment variables.</p>
      <div className="grid gap-3">
        {INTEGRATIONS.map((item) => {
          const configured = integrations?.[item.key] ?? false;
          return (
            <div key={item.key} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              <span
                className={
                  configured
                    ? "shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                    : "shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                }
              >
                {configured ? "Configured" : "Not configured"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
