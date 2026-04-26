import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { InvoiceIssuerSettingsForm } from "@/components/admin/InvoiceIssuerSettingsForm";

export default async function AdminInvoiceSettingsPage() {
  const session = await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Invoice settings</h1>
        <p className="text-sm text-muted-foreground">Company details, logo, and payment information shown on invoice PDFs</p>
      </div>

      <nav className="tab-bar">
        <Link href="/app/admin/users">Users</Link>
        <Link href="/app/admin/operations">Operations</Link>
        <Link href="/app/admin/activity">Activity</Link>
        <Link href="/app/admin/invoice-settings" className="active">
          Invoice settings
        </Link>
      </nav>

      <InvoiceIssuerSettingsForm workspaceId={session.workspaceId} />
    </div>
  );
}
