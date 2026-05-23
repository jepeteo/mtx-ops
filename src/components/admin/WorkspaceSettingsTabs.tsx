"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InvoiceIssuerSettingsForm } from "./InvoiceIssuerSettingsForm";
import { WorkspaceGeneralSettingsForm } from "./WorkspaceGeneralSettingsForm";
import { WorkspaceIntegrationsPanel } from "./WorkspaceIntegrationsPanel";
import { WorkspaceInvoicingDefaultsForm } from "./WorkspaceInvoicingDefaultsForm";
import { WorkspaceSettingsShell } from "./WorkspaceSettingsShell";

const TABS = [
  { id: "general", label: "General" },
  { id: "invoicing", label: "Invoicing" },
  { id: "integrations", label: "Integrations" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return value === "general" || value === "invoicing" || value === "integrations";
}

export function WorkspaceSettingsTabs({ workspaceId }: { workspaceId: string }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = isTabId(tabParam) ? tabParam : "general";

  return (
    <WorkspaceSettingsShell>
      <nav className="tab-bar mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/app/admin/settings?tab=${tab.id}`}
            className={activeTab === tab.id ? "active" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "general" ? <WorkspaceGeneralSettingsForm /> : null}
      {activeTab === "invoicing" ? (
        <div className="grid gap-8">
          <WorkspaceInvoicingDefaultsForm />
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issuer on PDFs</div>
            <InvoiceIssuerSettingsForm workspaceId={workspaceId} />
          </div>
        </div>
      ) : null}
      {activeTab === "integrations" ? <WorkspaceIntegrationsPanel /> : null}
    </WorkspaceSettingsShell>
  );
}
