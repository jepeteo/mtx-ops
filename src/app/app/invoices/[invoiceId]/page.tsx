import { requireSession } from "@/lib/auth/guards";
import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  await requireSession();
  const routeParams = await params;

  return <InvoiceDetailView invoiceId={routeParams.invoiceId} />;
}
