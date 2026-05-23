import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth/guards";
import { WorkspaceSettingsTabs } from "@/components/admin/WorkspaceSettingsTabs";

export default async function AdminSettingsPage() {
  const session = await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace defaults for renewals, inactivity notifications, and invoicing
        </p>
      </div>

      <nav className="tab-bar">
        <Link href="/app/admin/users">Users</Link>
        <Link href="/app/admin/operations">Operations</Link>
        <Link href="/app/admin/activity">Activity</Link>
        <Link href="/app/admin/settings" className="active">
          Settings
        </Link>
      </nav>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings…</p>}>
        <WorkspaceSettingsTabs workspaceId={session.workspaceId} />
      </Suspense>
    </div>
  );
}
