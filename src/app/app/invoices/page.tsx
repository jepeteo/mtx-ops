import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { InvoicesPageClient } from "@/components/invoices/InvoicesPageClient";

export default async function InvoicesPage() {
  const session = await requireRole("ADMIN");

  const clients = await db.client.findMany({
    where: { workspaceId: session.workspaceId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Create and manage client invoices.</p>
      </div>
      <InvoicesPageClient initialClients={clients} />
    </div>
  );
}
