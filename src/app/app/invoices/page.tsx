import { requireSession } from "@/lib/auth/guards";
import { InvoicesPageClient } from "@/components/invoices/InvoicesPageClient";

export default async function InvoicesPage() {
  await requireSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Create and manage client invoices.</p>
      </div>
      <InvoicesPageClient />
    </div>
  );
}
