import type { InvoiceRecord } from "@/components/invoices/types";

export function computeInvoiceDashboardMetrics(items: InvoiceRecord[], now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const unpaidCount = items.filter((invoice) => invoice.status === "draft" || invoice.status === "sent").length;
  const overdueCount = items.filter((invoice) => invoice.computedStatus === "overdue").length;
  const revenueIssuedMinor = items
    .filter((invoice) => new Date(invoice.issueDate).getTime() >= monthStart.getTime())
    .reduce((sum, invoice) => sum + invoice.totalMinor, 0);
  const revenuePaidMinor = items
    .filter((invoice) => invoice.paidAt && new Date(invoice.paidAt).getTime() >= monthStart.getTime())
    .reduce((sum, invoice) => sum + invoice.amountPaidMinor, 0);

  return {
    unpaidCount,
    overdueCount,
    revenueIssuedMinor,
    revenuePaidMinor,
  };
}
